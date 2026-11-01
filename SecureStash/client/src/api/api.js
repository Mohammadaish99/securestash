import axios from "axios";

// Resolve API base URL dynamically at RUNTIME in the browser
const getApiBaseUrl = () => {
  // 1. Explicit environment variable has top priority
  const envUrl = import.meta.env.VITE_API_URL;
  if (
    envUrl &&
    !envUrl.includes("localhost:5000") &&
    !envUrl.includes("127.0.0.1:5000")
  ) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
  }

  // 2. Runtime browser detection
  if (typeof window !== "undefined" && window.location) {
    const { origin, hostname, port } = window.location;

    // A. Running on Vite dev server (port 5173)
    if (port === "5173") {
      // If accessed from mobile phone on same Wi-Fi
      if (hostname !== "localhost" && hostname !== "127.0.0.1") {
        return `http://${hostname}:5000/api`;
      }
      return "http://localhost:5000/api";
    }

    // B. Hosted on Render (*.onrender.com), custom domain, or served directly from Express
    return `${origin}/api`;
  }

  // 3. Fallback for static builds
  return "https://securestash.onrender.com/api";
};

export const API_BASE_URL = getApiBaseUrl();

// Backend server root URL (without '/api') for direct file access and static assets
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, "");

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000 // 30s timeout to allow Render free tier cold-start wake up
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("securestash_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Bypass localtunnel reminder screen for API calls
  config.headers["bypass-tunnel-reminder"] = "true";
  return config;
});

// Auto-handle 401 token expiration across all API calls
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem("securestash_token");
      if (hadToken) {
        localStorage.removeItem("securestash_token");
        localStorage.removeItem("securestash_user");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("securestash_auth_expired", {
              detail: { message: "Your session has expired. Please sign in again." }
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;