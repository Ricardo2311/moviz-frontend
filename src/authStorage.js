const ACCESS_TOKEN_KEY = 'access_token';

export function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function storeToken(token) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
