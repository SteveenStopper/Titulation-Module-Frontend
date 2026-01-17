import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-coordinador-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html'
})
export class CoordinadorLayout {
  userName = 'Coordinador';
  userRole = 'Coordinador';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'C';
  }

  isProfileOpen = false;
  cronosOpen = false;
  comisionOpen = false;
  isAdmin = false;
  activePeriod: string | null = null;

  constructor(private router: Router, private auth: AuthService, private periodSvc: PeriodService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = u.firstname + ' ' + u.lastname;
      this.userRole = this.mapRole(u.roles[0]);
      this.isAdmin = this.auth.hasRole('Administrador');
    }
    this.auth.currentUser$.subscribe((user) => {
      if (user) {
        this.userName = user.firstname + ' ' + user.lastname;
        this.userRole = this.mapRole(user.roles[0]);
        this.isAdmin = this.auth.hasRole('Administrador');
      } else {
        this.userName = 'Coordinador';
        this.userRole = 'Invitado';
      }
    });

    // Cerrar los desplegables si navegamos fuera de sus rutas
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        const url = evt.urlAfterRedirects || evt.url;
        const insideCronos = /\/coordinador\/cronogramas\//.test(url);
        if (!insideCronos) this.cronosOpen = false;
        const insideComision = /\/coordinador\/comision\//.test(url);
        if (!insideComision) this.comisionOpen = false;
      }
    });
    // Sync active period from backend
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
    this.periodSvc.fetchAndSetFromBackend().subscribe();
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  toggleCronos() {
    this.cronosOpen = !this.cronosOpen;
  }

  toggleComision() {
    this.comisionOpen = !this.comisionOpen;
  }

  logout() {
    this.isProfileOpen = false;
    this.auth.logout();
  }

  private mapRole(role: string): string {
    if (!role) return 'Coordinador';
    
    const roleMap: {[key: string]: string} = {
      'Administrador': 'Administrador',
      'Estudiante': 'Estudiante',
      'Secretaria': 'Secretaría',
      'Tesoreria': 'Tesorería',
      'Coordinador': 'Coordinador',
      'Docente': 'Docente',
      'Vicerrector': 'Vicerrector'
    };
    
    return roleMap[role] || 'Coordinador';
  }
}
