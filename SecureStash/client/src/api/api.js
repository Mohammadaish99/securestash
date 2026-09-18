import axios from "axios";

// Resolve API base URL dynamically at RUNTIME in the browser
const getApiBaseUrl = () => {
  // 1. If running in a browser
  if (typeof window !== "undefined" && window.location) {
    const { origin, hostname, port } = window.location;

    // If served from Express (port 5000) or via public tunnel (e.g. .lhr.life), custom domain, or local IP:
    // Any port other than Vite dev server (5173) means frontend is served from backend or reverse proxy!
    if (port !== "5173") {
      return `${origin}/api`;
    }

    // If on Vite dev server (port 5173) accessed from a mobile phone / local network IP
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:5000/api`;
    }
  }

  // 2. If an explicit environment variable is set and not pointing to localhost
  const envUrl = import.meta.env.VITE_API_URL;
  if (
    envUrl &&
    !envUrl.includes("localhost:5000") &&
    !envUrl.includes("127.0.0.1:5000")
  ) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, "");
    return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
  }

  // 3. Default fallback for local developer machine
  return "http://localhost:5000/api";
};

export const API_BASE_URL = getApiBaseUrl();

// Backend server root URL (without '/api') for direct file access and static assets
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, "");

const API = axios.create({
  baseURL: API_BASE_URL
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

export default API;