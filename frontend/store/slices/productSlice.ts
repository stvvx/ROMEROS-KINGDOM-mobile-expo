import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { getApiUrl } from '../api';

interface ProductItem {
  _id: string;
  name: string;
  price: number;
  description?: string;
  images?: { url: string }[];
  ratings?: number;
  numOfReviews?: number;
  category?: string;
}

interface ProductState {
  products: ProductItem[];
  productsCount: number;
  filteredCount: number;
  resPerPage: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
}

interface FetchProductsArgs {
  page: number;
  isLoadMore?: boolean;
  price: [number, number];
  keyword?: string;
  category?: string;
}

const initialState: ProductState = {
  products: [],
  productsCount: 0,
  filteredCount: 0,
  resPerPage: 8,
  loading: true,
  loadingMore: false,
  hasMore: true,
  error: null,
};

export const fetchProducts = createAsyncThunk(
  'product/fetchProducts',
  async (args: FetchProductsArgs, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({
        page: String(args.page),
        'price[gte]': String(args.price[0]),
        'price[lte]': String(args.price[1]),
      });

      if (args.keyword) params.append('keyword', args.keyword);
      if (args.category && args.category !== 'All') params.append('category', args.category);

      const res = await axios.get(`${getApiUrl()}/products?${params}`, { timeout: 10000 });
      const fetched: ProductItem[] = res.data.products ?? [];
      const productsCount = res.data.productsCount ?? 0;
      const filteredCount = res.data.filteredProductsCount ?? productsCount;
      const resPerPage = res.data.resPerPage ?? 8;
      const hasMore = fetched.length > 0 && args.page * resPerPage < filteredCount;

      return {
        fetched,
        productsCount,
        filteredCount,
        resPerPage,
        hasMore,
        isLoadMore: !!args.isLoadMore,
      };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to fetch products');
    }
  }
);

const productSlice = createSlice({
  name: 'product',
  initialState,
  reducers: {
    resetProducts(state) {
      state.products = [];
      state.hasMore = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        const isLoadMore = !!action.meta.arg.isLoadMore;
        if (isLoadMore) {
          state.loadingMore = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<any>) => {
        const { fetched, productsCount, filteredCount, resPerPage, hasMore, isLoadMore } = action.payload;
        state.products = isLoadMore ? [...state.products, ...fetched] : fetched;
        state.productsCount = productsCount;
        state.filteredCount = filteredCount;
        state.resPerPage = resPerPage;
        state.hasMore = hasMore;
        state.loading = false;
        state.loadingMore = false;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = (action.payload as string) || 'Failed to fetch products';
      });
  },
});

export const { resetProducts } = productSlice.actions;
export default productSlice.reducer;
