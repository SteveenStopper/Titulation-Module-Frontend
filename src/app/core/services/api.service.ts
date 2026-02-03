import axios from 'axios';

const API_BASE =
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

// Configuración global de Axios
const api = axios.create({
  baseURL: API_BASE, // URL de tu backend
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas de error
try {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Si recibimos un 401 (No autorizado), redirigimos al login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login'; // Ajusta la ruta según tu aplicación
      }
      return Promise.reject(error);
    }
  );
} catch (e) {
  console.error('Error en el interceptor de respuesta:', e);
}

export default api;
