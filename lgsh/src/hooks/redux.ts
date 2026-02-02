import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';

/**
 * 타입 안전한 useDispatch 훅
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * 타입 안전한 useSelector 훅
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
