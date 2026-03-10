import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface AdminOrderState {
  orders: any[];
  loading: boolean;
  refreshing: boolean;
  updating: boolean;
  error: string | null;
}

const initialState: AdminOrderState = {
  orders: [],
  loading: true,
  refreshing: false,
  updating: false,
  error: null,
};

export const fetchAdminOrders = createAsyncThunk(
  'adminOrder/fetchAdminOrders',
  async (args: { silent?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${getApiUrl()}/admin/orders`, { headers });
      return { orders: res.data.orders || [], silent: !!args?.silent };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not fetch orders');
    }
  }
);

export const updateAdminOrderStatus = createAsyncThunk(
  'adminOrder/updateAdminOrderStatus',
  async (args: { orderId: string; status: string }, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      await axios.put(`${getApiUrl()}/admin/order/${args.orderId}`, { status: args.status }, { headers });
      return args;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to update order status');
    }
  }
);

const adminOrderSlice = createSlice({
  name: 'adminOrder',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrders.pending, (state, action) => {
        if (action.meta.arg?.silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.orders = action.payload.orders;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Could not fetch orders';
      })
      .addCase(updateAdminOrderStatus.pending, (state) => {
        state.updating = true;
      })
      .addCase(updateAdminOrderStatus.fulfilled, (state) => {
        state.updating = false;
      })
      .addCase(updateAdminOrderStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = (action.payload as string) || 'Failed to update order status';
      });
  },
});

export default adminOrderSlice.reducer;
