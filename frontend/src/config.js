/**
 * Backend API base URL. Use REACT_APP_BACKEND_URL in .env to override.
 * Defaults to http://localhost:8000 so the app works with a local backend without setup.
 */
export const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
export const API_URL = `${API_BASE}/api`;
