/**
 * 인증 Redux Slice
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuthState, LoginRequest, UserInfo } from '@/types';
import { authService } from '@/services';

// localStorage에서 안전하게 user 정보 가져오기
const getUserFromStorage = (): UserInfo | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
      return null;
    }
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
    return null;
  }
};

const initialUser = getUserFromStorage();
const initialAccessToken = localStorage.getItem('accessToken');
const initialRefreshToken = localStorage.getItem('refreshToken');

// 초기 상태
const initialState: AuthState = {
  isAuthenticated: !!initialAccessToken && !!initialUser,
  user: initialUser,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  loading: false,
  error: null,
  contractWarning: null,
};

// 로그인 Thunk
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      if (response.success && response.data) {
        // 토큰 저장
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('sessionId', `${response.data.user.userId}-${Date.now()}`);
        return response.data;
      }
      return rejectWithValue(response.message || '로그인에 실패했습니다.');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || '로그인에 실패했습니다.');
    }
  }
);

// 로그아웃 Thunk
export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authService.logout();
  } catch {
    // 서버 오류 무시
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId');
  }
  return null;
});

// 기존 코드 호환용 별칭
export const loginAsync = login;
export const logoutAsync = logout;

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserInfo>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearContractWarning: (state) => {
      state.contractWarning = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 로그인
      .addCase(login.pending, (state) => {
        state.loading = true;
        // 에러는 pending 시점에 초기화하지 않음 (사용자가 에러 메시지를 충분히 볼 수 있도록)
        // 에러는 성공 시에만 초기화
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.error = null; // 성공 시에만 에러 초기화
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.contractWarning = action.payload.contractWarning || null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // 로그아웃
      .addCase(logout.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.contractWarning = null;
      });
  },
});

export const { setUser, clearError, clearContractWarning } = authSlice.actions;
export default authSlice.reducer;
