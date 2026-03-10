import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface AdminReviewState {
  reviews: any[];
  loading: boolean;
  refreshing: boolean;
  deletingId: string | null;
  error: string | null;
}

const initialState: AdminReviewState = {
  reviews: [],
  loading: true,
  refreshing: false,
  deletingId: null,
  error: null,
};

export const fetchAdminReviews = createAsyncThunk(
  'adminReview/fetchAdminReviews',
  async (args: { silent?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      if (!token) return { reviews: [], silent: !!args?.silent };

      const res = await axios.get(`${getApiUrl()}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      });

      return { reviews: res.data.reviews || [], silent: !!args?.silent };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to load reviews');
    }
  }
);

export const deleteAdminReview = createAsyncThunk(
  'adminReview/deleteAdminReview',
  async (args: { reviewId: string; productId: string }, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      await axios.delete(`${getApiUrl()}/reviews`, {
        params: { id: args.reviewId, productId: args.productId },
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return args.reviewId;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to delete review');
    }
  }
);

const adminReviewSlice = createSlice({
  name: 'adminReview',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminReviews.pending, (state, action) => {
        if (action.meta.arg?.silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminReviews.fulfilled, (state, action) => {
        state.reviews = action.payload.reviews;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchAdminReviews.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Failed to load reviews';
      })
      .addCase(deleteAdminReview.pending, (state, action) => {
        state.deletingId = action.meta.arg.reviewId;
      })
      .addCase(deleteAdminReview.fulfilled, (state, action) => {
        state.reviews = state.reviews.filter((r: any) => r.reviewId !== action.payload);
        state.deletingId = null;
      })
      .addCase(deleteAdminReview.rejected, (state, action) => {
        state.deletingId = null;
        state.error = (action.payload as string) || 'Failed to delete review';
      });
  },
});

export default adminReviewSlice.reducer;
