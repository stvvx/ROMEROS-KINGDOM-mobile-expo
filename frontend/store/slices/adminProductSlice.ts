import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface AdminProductState {
  products: any[];
  categories: any[];
  loading: boolean;
  refreshing: boolean;
  deleting: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: AdminProductState = {
  products: [],
  categories: [],
  loading: true,
  refreshing: false,
  deleting: false,
  submitting: false,
  error: null,
};

export const fetchAdminProducts = createAsyncThunk(
  'adminProduct/fetchAdminProducts',
  async (args: { silent?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${getApiUrl()}/admin/products`, { headers });
      return { products: res.data.products || [], silent: !!args?.silent };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not fetch products');
    }
  }
);

export const fetchProductCategories = createAsyncThunk(
  'adminProduct/fetchProductCategories',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(`${getApiUrl()}/products/categories`);
      return res.data.categories || [];
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not fetch categories');
    }
  }
);

export const deleteAdminProduct = createAsyncThunk(
  'adminProduct/deleteAdminProduct',
  async (productId: string, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${getApiUrl()}/admin/product/${productId}`, { headers });
      return productId;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to delete product');
    }
  }
);

export const upsertAdminProduct = createAsyncThunk(
  'adminProduct/upsertAdminProduct',
  async (args: { editingId?: string | null; payload: any }, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const url = args.editingId
        ? `${getApiUrl()}/admin/product/${args.editingId}`
        : `${getApiUrl()}/admin/product/new`;

      await axios({
        method: args.editingId ? 'put' : 'post',
        url,
        data: args.payload,
        headers,
      });

      return { ok: true };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to save product');
    }
  }
);

const adminProductSlice = createSlice({
  name: 'adminProduct',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProducts.pending, (state, action) => {
        if (action.meta.arg?.silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminProducts.fulfilled, (state, action) => {
        state.products = action.payload.products;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchAdminProducts.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Could not fetch products';
      })
      .addCase(fetchProductCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      .addCase(deleteAdminProduct.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteAdminProduct.fulfilled, (state, action) => {
        state.products = state.products.filter((p: any) => p._id !== action.payload);
        state.deleting = false;
      })
      .addCase(deleteAdminProduct.rejected, (state, action) => {
        state.deleting = false;
        state.error = (action.payload as string) || 'Failed to delete product';
      })
      .addCase(upsertAdminProduct.pending, (state) => {
        state.submitting = true;
      })
      .addCase(upsertAdminProduct.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(upsertAdminProduct.rejected, (state, action) => {
        state.submitting = false;
        state.error = (action.payload as string) || 'Failed to save product';
      });
  },
});

export default adminProductSlice.reducer;
