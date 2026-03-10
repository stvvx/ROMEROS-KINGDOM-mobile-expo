import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface Review {
  _id: string;
  productId: string;
  productName: string;
  productImage?: string | null;
  rating: number;
  comment: string;
  images?: { public_id?: string; url: string }[];
  createdAt: string;
}

interface ReviewState {
  reviews: Review[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  needsAuth: boolean;
}

const initialState: ReviewState = {
  reviews: [],
  loading: true,
  refreshing: false,
  error: null,
  needsAuth: false,
};

export const fetchMyReviews = createAsyncThunk(
  'review/fetchMyReviews',
  async (args: { silent?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      if (!token) {
        return { reviews: [], needsAuth: true, silent: !!args?.silent };
      }

      const res = await axios.get(`${getApiUrl()}/reviews/my`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      return {
        reviews: res.data.reviews || [],
        needsAuth: false,
        silent: !!args?.silent,
      };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to load reviews');
    }
  }
);

const reviewSlice = createSlice({
  name: 'review',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyReviews.pending, (state, action) => {
        const silent = !!action.meta.arg?.silent;
        if (silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action: PayloadAction<any>) => {
        state.reviews = action.payload.reviews;
        state.needsAuth = action.payload.needsAuth;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Failed to load reviews';
      });
  },
});

export default reviewSlice.reducer;
