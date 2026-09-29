import { createApi } from '@reduxjs/toolkit/query/react';
import { setToken, setRefreshToken, clearToken, clearRefreshToken, getRefreshToken } from '@/constants/api';
import { baseQueryWithReauth } from './base-query-with-reauth';
import { setCredentials, clearCredentials } from './authSlice';
import type { AuthUser } from './authSlice';
import { jwtToAuthUser } from './decode-jwt';
import { socketManager } from '@/lib/socket-manager';
import type { AppDispatch } from './store';

interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  user?: Partial<AuthUser>;
}

interface MessageResponse {
  success: boolean;
  message: string;
}

interface OtpResponse extends MessageResponse {
  otp?: string;
}

interface VerifyOtpResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
  resetToken?: string;
  user?: Partial<AuthUser>;
  message: string;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    register: builder.mutation<
      MessageResponse,
      { name?: string; identifier: string; password: string; role: string; bvcRegistrationNumber?: string }
    >({
      query: (body) => {
        console.log('[2/8][FE authApi.ts] → POST /auth/register body:', body);
        return { url: '/auth/register', method: 'POST', body };
      },
    }),

    login: builder.mutation<
      SessionResponse,
      { identifier: string; password: string; rememberMe?: boolean }
    >({
      query: ({ identifier, password }) => ({
        url: '/auth/login',
        method: 'POST',
        body: { identifier, password },
      }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        await persistSession(dispatch, queryFulfilled, arg.rememberMe ?? true);
      },
    }),

    sendOtp: builder.mutation<OtpResponse, { phone: string; purpose?: 'login' | 'verify' | 'reset' }>({
      query: (body) => {
        console.log('[2/8][FE authApi.ts] → POST /auth/send-otp body:', body);
        return { url: '/auth/send-otp', method: 'POST', body };
      },
    }),

    verifyOtp: builder.mutation<
      VerifyOtpResponse,
      { phone: string; code: string; purpose?: 'login' | 'verify' | 'reset' }
    >({
      query: (body) => {
        console.log('[2/8][FE authApi.ts] → POST /auth/verify-otp body:', body);
        return { url: '/auth/verify-otp', method: 'POST', body };
      },
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        console.log('[2/8][FE authApi.ts] ← POST /auth/verify-otp response:', data);
        if (data.accessToken && data.refreshToken) {
          const user = (data.user as AuthUser) ?? jwtToAuthUser(data.accessToken);
          dispatch(
            setCredentials({ user, token: data.accessToken, refreshToken: data.refreshToken }),
          );
          await setToken(data.accessToken);
          await setRefreshToken(data.refreshToken);
        }
      },
    }),

    forgotPassword: builder.mutation<MessageResponse, { identifier: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: builder.mutation<MessageResponse, { resetToken: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),

    googleAuth: builder.mutation<SessionResponse, { idToken: string }>({
      query: (body) => ({ url: '/auth/oauth/google', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await persistSession(dispatch, queryFulfilled);
      },
    }),

    facebookAuth: builder.mutation<SessionResponse, { accessToken: string }>({
      query: (body) => ({ url: '/auth/oauth/facebook', method: 'POST', body }),
      onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
        await persistSession(dispatch, queryFulfilled);
      },
    }),

    logoutSession: builder.mutation<MessageResponse, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),

    setPassword: builder.mutation<MessageResponse, { newPassword: string }>({
      query: (body) => ({ url: '/auth/set-password', method: 'POST', body }),
    }),
  }),
});

async function persistSession(
  dispatch: AppDispatch,
  queryFulfilled: Promise<{ data: SessionResponse }>,
  rememberMe = true,
) {
  const { data } = await queryFulfilled;
  const user = (data.user as AuthUser) ?? jwtToAuthUser(data.accessToken);
  dispatch(setCredentials({ user, token: data.accessToken, refreshToken: data.refreshToken }));
  // "Keep me signed in" unchecked: keep the session in memory only (RTK Query's
  // baseQueryWithReauth can still refresh mid-session) but never write it to
  // SecureStore, so bootstrapAuth finds nothing and the user is signed out
  // the next time the app cold-starts.
  if (rememberMe) {
    await setToken(data.accessToken);
    await setRefreshToken(data.refreshToken);
  }
}

export async function logout(dispatch: AppDispatch) {
  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    dispatch(authApi.endpoints.logoutSession.initiate({ refreshToken }));
  }
  socketManager.disconnect();
  dispatch(clearCredentials());
  await clearToken();
  await clearRefreshToken();
}

export const {
  useRegisterMutation,
  useLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGoogleAuthMutation,
  useFacebookAuthMutation,
  useSetPasswordMutation,
} = authApi;
