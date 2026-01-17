import axios from 'axios';

// Configuración global de Axios
const api = axios.create({
  baseURL: 'http://localhost:3000/api', // URL de tu backend
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
