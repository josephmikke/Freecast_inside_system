// eslint-disable-next-line import/no-extraneous-dependencies
import { configureStore } from '@reduxjs/toolkit';
import channelMonitorReducer from './slices/channelMonitorSlice';

export const store = configureStore({
  reducer: {
    channelMonitor: channelMonitorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
