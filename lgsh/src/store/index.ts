/**
 * Redux Store 설정
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import menuReducer from './slices/menuSlice';
import uiReducer from './slices/uiSlice';
import favoriteReducer from './slices/favoriteSlice';
import spiderReducer from './slices/spiderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    menu: menuReducer,
    ui: uiReducer,
    favorite: favoriteReducer,
    spider: spiderReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
