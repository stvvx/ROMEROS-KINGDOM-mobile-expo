import { configureStore } from '@reduxjs/toolkit';

import productReducer from './slices/productSlice';
import orderReducer from './slices/orderSlice';
import reviewReducer from './slices/reviewSlice';
import adminOrderReducer from './slices/adminOrderSlice';
import adminReviewReducer from './slices/adminReviewSlice';
import adminProductReducer from './slices/adminProductSlice';
import adminVoucherReducer from './slices/adminVoucherSlice';

export const store = configureStore({
  reducer: {
    product: productReducer,
    order: orderReducer,
    review: reviewReducer,
    adminOrder: adminOrderReducer,
    adminReview: adminReviewReducer,
    adminProduct: adminProductReducer,
    adminVoucher: adminVoucherReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
