import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id_user: number;
  email: string;
  firstname: string;
  lastname: string;
  name?: string;
  role?: string;
  roles: string[];
  is_active: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Usamos el apiBaseInterceptor, por lo que podemos usar rutas relativas que empiecen con /api
  private apiUrl = '/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  // Mapeo de roles a rutas por defecto
  private readonly DEFAULT_ROUTES: { [key: string]: string } = {
    'Estudiante': '/estudiante',
    'Administrador': '/administrador/inicio',
    'Coordinador': '/coordinador/inicio',
    'Docente': '/docente/inicio',
    'Tesoreria': '/tesoreria/inicio',
    'Secretaria': '/secretaria/inicio',
    'Vicerrector': '/vicerrector/inicio',
    'Ingles': '/ingles/inicio',
    'Vinculacion_Practicas': '/vinculacion-practicas/inicio'
  };

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private getStoredUser(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.roles.includes(role) : false;
  }

  hasAnyRole(roles: string[]): boolean {
    if (!this.currentUserValue?.roles) return false;
    return this.currentUserValue.roles.some(role => roles.includes(role));
  }

  getDefaultRoute(): string {
    const user = this.currentUserValue;
    if (!user) return '/login';

    // Prioridad explícita de roles para ruta por defecto
    const priority = [
      'Administrador',
      'Tesoreria',
      'Secretaria',
      'Coordinador',
      'Docente',
      'Vicerrector',
      'Ingles',
      'Vinculacion_Practicas',
      'Estudiante',
    ];

    const userRole = priority.find(r => user.roles.includes(r) && this.DEFAULT_ROUTES[r]);
    return userRole ? this.DEFAULT_ROUTES[userRole] : '/unauthorized';
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        map((resp: any) => {
          // Normalizar respuesta del backend (usuarios) al modelo User del FE
          const beUser = resp?.user || {};
          const user: User = {
            id_user: beUser.usuario_id ?? beUser.id_user ?? 0,
            email: beUser.correo ?? beUser.email ?? '',
            firstname: beUser.nombre ?? beUser.firstname ?? '',
            lastname: beUser.apellido ?? beUser.lastname ?? '',
            name: beUser.name ?? `${beUser.nombre ?? ''} ${beUser.apellido ?? ''}`.trim(),
            roles: Array.isArray(beUser.roles) ? beUser.roles : (Array.isArray(resp?.user?.roles) ? resp.user.roles : []),
            is_active: (beUser.activo ?? beUser.is_active) ?? true,
          };
          const normalized: LoginResponse = { token: resp?.token, user };
          return normalized;
        }),
        tap((response: LoginResponse) => {
          if (response?.token) {
            this.storeAuthData(response);
            this.currentUserSubject.next(response.user);
          }
        }),
        catchError(this.handleError)
      );
  }

  private storeAuthData(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
  }

  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  logout(redirectToLogin: boolean = true): void {
    this.clearAuthData();
    this.currentUserSubject.next(null);
    if (redirectToLogin) {
      this.router.navigate(['/login']);
    }
  }

  getAuthHeaders(): { [header: string]: string } {
    const token = localStorage.getItem(this.TOKEN_KEY);
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (error.status === 0) {
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    } else if (error.status === 401) {
      errorMessage = 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.';
    } else if (error.status === 403) {
      errorMessage = 'No tienes permisos para acceder a este recurso.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Verifica si el token está próximo a expirar (útil para renovación automática)
  isTokenExpiringSoon(thresholdMinutes: number = 5): boolean {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      return expiresIn < (thresholdMinutes * 60);
    } catch (e) {
      return true;
    }
  }
}
