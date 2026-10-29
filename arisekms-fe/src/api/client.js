import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3006/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

const ACCESS_KEY = 'arisekms_access_token';
const REFRESH_KEY = 'arisekms_refresh_token';
export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};
export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// shortcut: stateless single-retry refresh, no server revocation list; add blocklist when revocation matters.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (response?.status !== 401 || config?._retried) throw error;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      clearTokens();
      if (location.pathname !== '/login') location.assign('/login');
      throw error;
    }
    try {
      refreshing ??= axios
        .post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken })
        .then((r) => r.data.data ?? r.data);
      const tokens = await refreshing;
      setTokens(tokens);
      config._retried = true;
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(config);
    } catch {
      clearTokens();
      if (location.pathname !== '/login') location.assign('/login');
      throw error;
    } finally {
      refreshing = null;
    }
  },
);
