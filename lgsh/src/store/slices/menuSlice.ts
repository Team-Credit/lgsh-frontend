/**
 * 메뉴 Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { MenuState, MenuPermission } from '@/types';
import { menuService } from '@/services';

// 초기 상태
const initialState: MenuState = {
  menus: [],
  permissions: {},
  selectedKeys: [],
  openKeys: [],
  collapsed: false,
  loading: false,
  error: null,
};

// 메뉴 조회 Thunk
export const fetchMenus = createAsyncThunk('menu/fetchMenus', async (_, { rejectWithValue }) => {
  try {
    const response = await menuService.getUserMenus();
    if (response.success && response.data) {
      return response.data;
    }
    return rejectWithValue(response.message || '메뉴를 불러오는데 실패했습니다.');
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    return rejectWithValue(err.response?.data?.message || '메뉴를 불러오는데 실패했습니다.');
  }
});

// Slice
const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedKeys: (state, action: PayloadAction<string[]>) => {
      state.selectedKeys = action.payload;
    },
    setOpenKeys: (state, action: PayloadAction<string[]>) => {
      state.openKeys = action.payload;
    },
    toggleCollapsed: (state) => {
      state.collapsed = !state.collapsed;
    },
    setCollapsed: (state, action: PayloadAction<boolean>) => {
      state.collapsed = action.payload;
    },
    clearMenus: (state) => {
      state.menus = [];
      state.permissions = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMenus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenus.fulfilled, (state, action) => {
        state.loading = false;
        state.menus = action.payload.menus;
        // 권한을 객체로 변환
        const permObj: Record<string, MenuPermission> = {};
        action.payload.permissions.forEach((p: MenuPermission) => {
          permObj[p.menuId] = p;
        });
        state.permissions = permObj;
      })
      .addCase(fetchMenus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedKeys, setOpenKeys, toggleCollapsed, setCollapsed, clearMenus } =
  menuSlice.actions;
export default menuSlice.reducer;
