import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from './index';
import type { RootState } from './types';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
