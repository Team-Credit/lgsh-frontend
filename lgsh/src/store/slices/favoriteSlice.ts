/**
 * 즐겨찾기 Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { FavoriteItem } from '@/types';
import { favoriteService } from '@/services/favoriteService';

// 즐겨찾기 상태 인터페이스
interface FavoriteState {
  favorites: FavoriteItem[];
  loading: boolean;
  error: string | null;
}

// 초기 상태
const initialState: FavoriteState = {
  favorites: [],
  loading: false,
  error: null,
};

// 즐겨찾기 목록 조회 Thunk
export const fetchFavorites = createAsyncThunk(
  'favorite/fetchFavorites',
  async (_, { rejectWithValue }) => {
    try {
      const response = await favoriteService.getFavorites();
      if (response.success && response.data) {
        return response.data.favorites;
      }
      return rejectWithValue(response.message || '즐겨찾기를 불러오는데 실패했습니다.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || '즐겨찾기를 불러오는데 실패했습니다.');
    }
  }
);

// 즐겨찾기 토글 Thunk
export const toggleFavorite = createAsyncThunk(
  'favorite/toggleFavorite',
  async (menuId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await favoriteService.toggleFavorite(menuId);
      if (response.success && response.data) {
        // 즐겨찾기 목록 새로고침
        dispatch(fetchFavorites());
        return response.data;
      }
      return rejectWithValue(response.message || '즐겨찾기 변경에 실패했습니다.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || '즐겨찾기 변경에 실패했습니다.');
    }
  }
);

// 즐겨찾기 추가 Thunk
export const addFavorite = createAsyncThunk(
  'favorite/addFavorite',
  async (menuId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await favoriteService.addFavorite(menuId);
      if (response.success && response.data) {
        // 즐겨찾기 목록 새로고침
        dispatch(fetchFavorites());
        return response.data;
      }
      return rejectWithValue(response.message || '즐겨찾기 추가에 실패했습니다.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || '즐겨찾기 추가에 실패했습니다.');
    }
  }
);

// 즐겨찾기 삭제 Thunk
export const removeFavorite = createAsyncThunk(
  'favorite/removeFavorite',
  async (menuId: string, { rejectWithValue, dispatch }) => {
    try {
      const response = await favoriteService.removeFavorite(menuId);
      if (response.success && response.data) {
        // 즐겨찾기 목록 새로고침
        dispatch(fetchFavorites());
        return response.data;
      }
      return rejectWithValue(response.message || '즐겨찾기 삭제에 실패했습니다.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || '즐겨찾기 삭제에 실패했습니다.');
    }
  }
);

// Slice
const favoriteSlice = createSlice({
  name: 'favorite',
  initialState,
  reducers: {
    clearFavorites: (state) => {
      state.favorites = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchFavorites
      .addCase(fetchFavorites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavorites.fulfilled, (state, action: PayloadAction<FavoriteItem[]>) => {
        state.loading = false;
        state.favorites = action.payload;
      })
      .addCase(fetchFavorites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // toggleFavorite
      .addCase(toggleFavorite.pending, (state) => {
        state.loading = true;
      })
      .addCase(toggleFavorite.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // addFavorite
      .addCase(addFavorite.pending, (state) => {
        state.loading = true;
      })
      .addCase(addFavorite.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(addFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // removeFavorite
      .addCase(removeFavorite.pending, (state) => {
        state.loading = true;
      })
      .addCase(removeFavorite.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(removeFavorite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearFavorites } = favoriteSlice.actions;
export default favoriteSlice.reducer;
