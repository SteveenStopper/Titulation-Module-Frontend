import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-tesoreria-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html'
})
export class TesoreriaLayout {
  userName = 'Tesorería';
  userRole = 'Tesorería';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'T';
  }

  isProfileOpen = false;
  isAdmin = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [];
  // Loading flags
  get periodLoading$() { return this.periodSvc.loadingActive$; }
  get periodListLoading$() { return this.periodSvc.loadingList$; }

  private toTitleCase(name: string): string {
    const s = String(name || '').trim();
    if (!s) return '';
    return s
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(p => p.length ? (p[0].toUpperCase() + p.slice(1)) : p)
      .join(' ');
  }

  constructor(private router: Router, private auth: AuthService, private periodSvc: PeriodService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = this.toTitleCase(`${u.firstname || ''} ${u.lastname || ''}`);
      this.userRole = this.mapRole(u.roles[0]);
      this.isAdmin = this.auth.hasRole('Administrador');
    }
    this.auth.currentUser$.subscribe((user) => {
      if (user) {
        this.userName = this.toTitleCase(`${user.firstname || ''} ${user.lastname || ''}`);
        this.userRole = this.mapRole(user.roles[0]);
      } else {
        this.userName = 'Tesorería';
        this.userRole = 'Invitado';
      }
    });
    // Sincronizar período activo global
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
    this.periodSvc.fetchAndSetFromBackend().subscribe();
    // Cargar periodos desde backend
    this.periodSvc.listAll().subscribe(list => {
      this.periodOptions = (list || []).map(p => p.name);
    });
  }

  toggleProfile() { this.isProfileOpen = !this.isProfileOpen; }
  logout() { this.isProfileOpen = false; this.auth.logout(); }

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }

  private mapRole(role: string): string {
    if (!role) return 'Tesorería';
    const roleMap: {[k:string]: string} = {
      'Administrador': 'Administrador',
      'Estudiante': 'Estudiante',
      'Secretaria': 'Secretaría',
      'Tesoreria': 'Tesorería',
      'Coordinador': 'Coordinador',
      'Docente': 'Docente',
      'Vicerrector': 'Vicerrector',
      'Ingles': 'Inglés',
      'Vinculacion_Practicas': 'Vinculación/Prácticas'
    };
    return roleMap[role] || 'Tesorería';
  }
}
