import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface AdminVoucherState {
  vouchers: any[];
  loading: boolean;
  refreshing: boolean;
  saving: boolean;
  deleting: boolean;
  error: string | null;
}

const initialState: AdminVoucherState = {
  vouchers: [],
  loading: true,
  refreshing: false,
  saving: false,
  deleting: false,
  error: null,
};

export const fetchAdminVouchers = createAsyncThunk(
  'adminVoucher/fetchAdminVouchers',
  async (args: { silent?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${getApiUrl()}/admin/vouchers`, { headers });
      return { vouchers: res.data.vouchers || [], silent: !!args?.silent };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not fetch vouchers');
    }
  }
);

export const upsertAdminVoucher = createAsyncThunk(
  'adminVoucher/upsertAdminVoucher',
  async (args: { editingId?: string | null; payload: any }, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      if (args.editingId) {
        await axios.put(`${getApiUrl()}/admin/voucher/${args.editingId}`, args.payload, { headers });
      } else {
        await axios.post(`${getApiUrl()}/admin/voucher/new`, args.payload, { headers });
      }

      return { ok: true };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not save voucher');
    }
  }
);

export const deleteAdminVoucher = createAsyncThunk(
  'adminVoucher/deleteAdminVoucher',
  async (voucherId: string, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${getApiUrl()}/admin/voucher/${voucherId}`, { headers });
      return voucherId;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Could not delete voucher');
    }
  }
);

const adminVoucherSlice = createSlice({
  name: 'adminVoucher',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminVouchers.pending, (state, action) => {
        if (action.meta.arg?.silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminVouchers.fulfilled, (state, action) => {
        state.vouchers = action.payload.vouchers;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchAdminVouchers.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Could not fetch vouchers';
      })
      .addCase(upsertAdminVoucher.pending, (state) => {
        state.saving = true;
      })
      .addCase(upsertAdminVoucher.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(upsertAdminVoucher.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) || 'Could not save voucher';
      })
      .addCase(deleteAdminVoucher.pending, (state) => {
        state.deleting = true;
      })
      .addCase(deleteAdminVoucher.fulfilled, (state, action) => {
        state.vouchers = state.vouchers.filter((v: any) => v._id !== action.payload);
        state.deleting = false;
      })
      .addCase(deleteAdminVoucher.rejected, (state, action) => {
        state.deleting = false;
        state.error = (action.payload as string) || 'Could not delete voucher';
      });
  },
});

export default adminVoucherSlice.reducer;
