import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-estudiante-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html'
})
export class EstudianteLayout {
  // Datos del usuario desde AuthService
  userName = 'Estudiante';
  userRole = 'Estudiante';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'U';
  }

  isProfileOpen = false;
  uicOpen = false;
  complexivoOpen = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];

  constructor(private router: Router, private auth: AuthService, private periodSvc: PeriodService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = u.name || this.userName;
      this.userRole = this.mapRole(u.role);
    }
    // Suscribirse para reflejar cambios si cambian en runtime
    this.auth.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userName = user.name || 'Estudiante';
        this.userRole = this.mapRole(user.role);
      } else {
        this.userName = 'Estudiante';
        this.userRole = 'Invitado';
      }
    });

    // Auto-cerrar grupos al salir de sus rutas
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        const url = evt.urlAfterRedirects || evt.url;
        const insideUIC = /\/estudiante\/(cronograma-uic|avance)(\/|$)/.test(url);
        const insideComplexivo = /\/estudiante\/(cronograma-complexivo|tutorias)(\/|$)/.test(url);
        if (!insideUIC) this.uicOpen = false;
        if (!insideComplexivo) this.complexivoOpen = false;
      }
    });
    // Sincronizar período activo global
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout() {
    this.isProfileOpen = false;
    this.auth.logout();
  }

  toggleUIC() {
    this.uicOpen = !this.uicOpen;
  }

  toggleComplexivo() {
    this.complexivoOpen = !this.complexivoOpen;
  }

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }

  private mapRole(role?: string): string {
    switch (role) {
      case 'student': return 'Estudiante';
      case 'coordinator': return 'Coordinador';
      case 'teacher': return 'Docente';
      case 'treasury': return 'Tesorería';
      case 'secretary': return 'Secretaría';
      default: return 'Usuario';
    }
  }
}
