import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize with user from localStorage if exists
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser ? JSON.parse(storedUser) : null
    );
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  login(email: string, password: string): Observable<LoginResponse> {
    // In a real app, you would make an HTTP request to your authentication API
    // For demo purposes, we'll simulate an API call with a timeout
    return of({
      user: {
        id: '1',
        email,
        name: email.split('@')[0].split('.')[0],
        role: this.getRoleFromEmail(email),
        token: 'dummy-jwt-token'
      },
      token: 'dummy-jwt-token'
    }).pipe(
      tap(response => {
        // Store user details and jwt token in local storage
        localStorage.setItem('currentUser', JSON.stringify(response.user));
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    // Remove user from local storage and set current user to null
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private getRoleFromEmail(email: string): string {
    // This is a simplified example - in a real app, the role would come from the server
    if (email.includes('admin') || email.includes('administrador')) return 'admin';
    if (email.includes('estudiante')) return 'student';
    if (email.includes('coordinador')) return 'coordinator';
    if (email.includes('docente')) return 'teacher';
    if (email.includes('tesorer')) return 'treasury';
    if (email.includes('secretar')) return 'secretary';
    if (email.includes('vicerrector')) return 'vice_chancellor';
    return 'user';
  }

  // Helper method to check if user has specific role
  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user?.role === role;
  }
}
