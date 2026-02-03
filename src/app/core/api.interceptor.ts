import { HttpInterceptorFn } from '@angular/common/http';

const API_BASE =
  (typeof window !== 'undefined' && (window as any).__API_BASE__) ||
  (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api');

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // Impersonación de Docente (solo para Administrador) - se transmite como query param
  try {
    const storedUser = localStorage.getItem('auth_user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const roles: string[] = Array.isArray(user?.roles) ? user.roles.map((r: any) => String(r)) : [];
    const isAdmin = roles.includes('Administrador');
    const asDocenteIdRaw = localStorage.getItem('impersonate_docente_id');
    const asDocenteId = asDocenteIdRaw != null ? Number(asDocenteIdRaw) : NaN;
    if (isAdmin && Number.isFinite(asDocenteId) && req.url.startsWith('/api/docente/')) {
      req = req.clone({ setParams: { asDocenteId: String(asDocenteId) } });
    }
  } catch { /* noop */ }

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
