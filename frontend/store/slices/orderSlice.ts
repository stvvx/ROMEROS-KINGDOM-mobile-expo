import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

import { getItem } from '@/utils/storage';
import { getApiUrl } from '../api';

interface OrderItem {
  _id: string;
  name: string;
  quantity: number;
  image: string;
  price: number;
  product: string;
}

export interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingInfo: {
    address: string;
    city: string;
    phoneNo: string;
    postalCode: string;
    country: string;
  };
  paymentInfo?: { id?: string; status?: string };
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  orderStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | string;
  paidAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

interface FetchOrdersArgs {
  silent?: boolean;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  needsAuth: boolean;
}

const initialState: OrderState = {
  orders: [],
  loading: true,
  refreshing: false,
  error: null,
  needsAuth: false,
};

export const fetchMyOrders = createAsyncThunk(
  'order/fetchMyOrders',
  async (args: FetchOrdersArgs | undefined, { rejectWithValue }) => {
    try {
      const token = await getItem('authToken');
      if (!token) {
        return { orders: [], needsAuth: true, silent: !!args?.silent };
      }

      const res = await axios.get(`${getApiUrl()}/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const list: Order[] = res.data.orders ?? res.data ?? [];
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { orders: list, needsAuth: false, silent: !!args?.silent };
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.message || err?.message || 'Failed to load orders');
    }
  }
);

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state, action) => {
        const silent = !!action.meta.arg?.silent;
        if (silent) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action: PayloadAction<any>) => {
        state.orders = action.payload.orders;
        state.needsAuth = action.payload.needsAuth;
        state.loading = false;
        state.refreshing = false;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = (action.payload as string) || 'Failed to load orders';
      });
  },
});

export default orderSlice.reducer;
