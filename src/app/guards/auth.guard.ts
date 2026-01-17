import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard para rutas que requieren autenticación
 * Opcionalmente, puede requerir roles específicos
 */
export const AuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Si no está autenticado, redirigir al login
  if (!authService.isAuthenticated()) {
    return redirectToLogin(router, state.url);
  }

  // Verificar si la ruta requiere roles específicos
  const requiredRoles = route.data['roles'] as string[];
  
  if (!requiredRoles || requiredRoles.length === 0) {
    // No se requieren roles específicos, solo autenticación
    return true;
  }

  // Verificar si el usuario tiene al menos uno de los roles requeridos
  // Regla especial: "Administrador" puede acceder a todo EXCEPTO rutas de Estudiante
  const isAdmin = authService.hasRole('Administrador');
  const isStudentRoute = requiredRoles.includes('Estudiante');
  if (authService.hasAnyRole(requiredRoles) || (isAdmin && !isStudentRoute)) {
    return true;
  }

  // Redirigir a la ruta por defecto según su rol para evitar acceso cruzado
  const defaultRoute = authService.getDefaultRoute();
  return router.createUrlTree([defaultRoute]);
};

/**
 * Guard para rutas públicas (login, registro, etc.)
 * Redirige a la página de inicio si el usuario ya está autenticado
 */
export const NoAuthGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Si ya está autenticado, redirigir a la ruta por defecto según su rol
  if (authService.isAuthenticated()) {
    const defaultRoute = authService.getDefaultRoute();
    return router.createUrlTree([defaultRoute]);
  }
  
  return true;
};

/**
 * Redirige al login manteniendo la URL de destino
 */
function redirectToLogin(router: Router, returnUrl: string): UrlTree {
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: returnUrl || '/' }
  });
}

/**
 * Factory para crear un guard con roles personalizados
 * Uso: 
 * {
 *   path: 'ruta-protegida',
 *   component: MiComponente,
 *   canActivate: [roleGuard(['Admin', 'SuperAdmin'])]
 * }
 */
export function roleGuard(roles: string[]): CanActivateFn {
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (!authService.isAuthenticated()) {
      return redirectToLogin(router, state.url);
    }
    
    if (authService.hasAnyRole(roles)) {
      return true;
    }
    
    return router.createUrlTree(['/unauthorized'], {
      queryParams: { 
        message: 'No tienes permisos para acceder a esta sección',
        requiredRoles: roles.join(', ')
      }
    });
  };
}
