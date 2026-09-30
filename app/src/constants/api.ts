import * as SecureStore from "expo-secure-store";
// for production deployment
// export const API_URL =
//   process.env.EXPO_PUBLIC_API_URL || "https://backend.gobaadi.com";

// for local development
export const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const AUTH_TOKEN_KEY = "gobadi_jwt";
const REFRESH_TOKEN_KEY = "gobadi_refresh_jwt";
const LANGUAGE_KEY = "gobadi_language";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.message || `API error: ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`API Fetch failed for ${url}:`, error);
    throw error;
  }
}

export async function getLanguage(): Promise<string | null> {
  return SecureStore.getItemAsync(LANGUAGE_KEY);
}

export async function setLanguage(lang: string): Promise<void> {
  await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
}
