import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Attach JWT token to every request if the user is logged in
api.interceptors.request.use((config) => {
  const stored = sessionStorage.getItem("kconnect_user");
  if (stored) {
    try {
      const { token } = JSON.parse(stored);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      sessionStorage.removeItem("kconnect_user");
    }
  }
  return config;
});

export default api;
