import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const status = err.status;
      const msg = (err.error && (err.error.message || err.error.error)) || err.message || 'Error inesperado';
      // Endpoints de solo lectura donde el UI maneja fallback: silenciar toasts
      const silent = (
        req.method === 'GET' && (
          /\/api\/enrollments\/current/.test(req.url) ||
          /\/api\/uic\/estudiante\/avance/.test(req.url) ||
          /\/api\/complexivo\/estudiante\/materias/.test(req.url) ||
          /\/api\/vouchers(\?|$|\/)/.test(req.url)
        )
      );

      if (status === 401) {
        toastr.error('Sesión expirada. Inicia sesión nuevamente.', 'No autorizado');
        try { auth.logout(); } catch {}
        // Router redirigirá en logout; fallback:
        try { router.navigateByUrl('/login'); } catch {}
      } else if (status === 403) {
        toastr.error('No tienes permisos para esta acción.', 'Acceso denegado');
      } else if (status >= 500) {
        if (!silent) toastr.error('Ocurrió un problema en el servidor.', `Error ${status}`);
      } else {
        if (!silent) toastr.error(String(msg), `Error ${status || ''}`.trim());
      }

      return throwError(() => err);
    })
  );
};
