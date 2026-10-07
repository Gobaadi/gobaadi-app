import { useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  FACEBOOK_APP_ID,
  isGoogleConfigured,
  isFacebookConfigured,
} from '@/constants/oauth';
import { useGoogleAuthMutation, useFacebookAuthMutation } from '@/store/authApi';
import { store } from '@/store/store';
import { setCredentials } from '@/store/authSlice';
import { jwtToAuthUser } from '@/store/decode-jwt';

const FACEBOOK_DISCOVERY = {
  authorizationEndpoint: 'https://www.facebook.com/v19.0/dialog/oauth',
};

/** Wires the existing Google/Facebook buttons to real OAuth flows once credentials are configured. */
export function useSocialAuth(onSuccess: () => void) {
  const [error, setError] = useState('');

  const [googleAuth, { isLoading: isGoogleLoading }] = useGoogleAuthMutation();
  const [facebookAuth, { isLoading: isFacebookLoading }] = useFacebookAuthMutation();

  const [googleRequest, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    clientId: GOOGLE_WEB_CLIENT_ID,
  });

  const [facebookRequest, , promptFacebookAsync] = AuthSession.useAuthRequest(
    {
      clientId: FACEBOOK_APP_ID,
      scopes: ['public_profile', 'email'],
      responseType: AuthSession.ResponseType.Token,
      redirectUri: AuthSession.makeRedirectUri(),
    },
    FACEBOOK_DISCOVERY,
  );

  const withGoogle = async () => {
    setError('');
    if (!isGoogleConfigured || !googleRequest) {
      setError('Google sign-in is not configured yet.');
      return;
    }
    const result = await promptGoogleAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return;
    }
    if (result.type !== 'success' || !result.params?.id_token) {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    try {
      const data = await googleAuth({ idToken: result.params.id_token }).unwrap();
      const user = (data.user as any) ?? jwtToAuthUser(data.accessToken);
      store.dispatch(setCredentials({
        user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      }));
      onSuccess();
    } catch {
      setError('Google sign-in failed. Please try again.');
    }
  };

  const withFacebook = async () => {
    setError('');
    if (!isFacebookConfigured || !facebookRequest) {
      setError('Facebook sign-in is not configured yet.');
      return;
    }
    const result = await promptFacebookAsync();
    if (result.type === 'cancel' || result.type === 'dismiss') {
      return;
    }
    if (result.type !== 'success' || !result.params?.access_token) {
      setError('Facebook sign-in failed. Please try again.');
      return;
    }
    try {
      const data = await facebookAuth({ accessToken: result.params.access_token }).unwrap();
      const user = (data.user as any) ?? jwtToAuthUser(data.accessToken);
      store.dispatch(setCredentials({
        user,
        token: data.accessToken,
        refreshToken: data.refreshToken,
      }));
      onSuccess();
    } catch {
      setError('Facebook sign-in failed. Please try again.');
    }
  };

  return {
    withGoogle,
    withFacebook,
    isLoading: isGoogleLoading || isFacebookLoading,
    error,
  };
}
