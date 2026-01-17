import { HttpInterceptorFn } from '@angular/common/http';

const API_BASE = (typeof window !== 'undefined' && (window as any).__API_BASE__) || 'http://localhost:3000/api';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // Si la URL empieza con /api/, la redirigimos al backend /api
  if (req.url.startsWith('/api/')) {
    const url = `${API_BASE}${req.url.replace(/^\/api/, '')}`;
    req = req.clone({ url });
  }
  return next(req);
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  try {
    // Primero: token directo (nuevo esquema)
    const directToken = localStorage.getItem('auth_token');
    if (directToken) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${directToken}` } });
    } else {
      // Compatibilidad: usuario serializado (esquema antiguo)
      const storedUser = localStorage.getItem('currentUser') || localStorage.getItem('auth_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const token = user?.token;
        if (token) {
          req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
        }
      }
    }
  } catch {}
  return next(req);
};
