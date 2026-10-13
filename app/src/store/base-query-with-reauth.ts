import {
  BaseQueryFn,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { API_URL, setToken, setRefreshToken, clearToken, clearRefreshToken, getToken } from '@/constants/api';
import { setCredentials, clearCredentials } from './authSlice';
import { jwtToAuthUser } from './decode-jwt';
import type { RootState, AppDispatch } from './store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Only one refresh request may be in flight at a time — the backend rotates
// (revokes) the refresh token on use, so concurrent refreshes would race and
// the loser would be rejected with a valid-looking but already-spent token.
// Shared across RTK Query's baseQueryWithReauth and SocketManager's own
// reauth-on-connect-error path, since both can trigger a refresh independently.
let refreshPromise: Promise<string | null> | null = null;

/**
 * Refreshes the access/refresh token pair using the current store's refresh
 * token, persisting and dispatching the result. Returns the new access token
 * on success, or null if there is no valid refresh token to use.
 */
export async function refreshAccessToken(
  dispatch: AppDispatch,
  getState: () => RootState,
): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getState().auth.refreshToken;
      if (!refreshToken) {
        return null;
      }

      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
        { dispatch, getState } as any,
        {},
      );

      const data = refreshResult.data as
        | { accessToken?: string; refreshToken?: string }
        | undefined;
      if (!data?.accessToken || !data?.refreshToken) {
        return null;
      }

      const refreshedUser = jwtToAuthUser(data.accessToken);
      // Keep the name from the current session if the new token doesn't carry
      // one — otherwise a routine refresh would wipe the greeting name.
      const user = refreshedUser
        ? { ...refreshedUser, name: refreshedUser.name ?? getState().auth.user?.name }
        : null;
      dispatch(
        setCredentials({ user, token: data.accessToken, refreshToken: data.refreshToken }),
      );
      // Only re-persist to disk if the session was already persisted there —
      // "keep me signed in" unchecked means memory-only, and a background
      // token refresh must not silently opt an unremembered session into
      // surviving app restarts.
      const wasPersisted = await getToken();
      if (wasPersisted) {
        await setToken(data.accessToken);
        await setRefreshToken(data.refreshToken);
      }
      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const newAccessToken = await refreshAccessToken(
      api.dispatch as AppDispatch,
      api.getState as () => RootState,
    );

    if (newAccessToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
      await clearToken();
      await clearRefreshToken();
    }
  }

  return result;
};
