import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../services/period.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ingles-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class InglesLayout {
  userName = 'Usuario';
  userRole = 'Usuario';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'U';
  }
  isProfileOpen = false;
  isAdmin = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [];
  // Loading flags
  get periodLoading$() { return this.periodSvc.loadingActive$; }
  get periodListLoading$() { return this.periodSvc.loadingList$; }

  constructor(private periodSvc: PeriodService, private auth: AuthService) {
    // Datos de usuario
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = `${u.firstname} ${u.lastname}`;
      this.userRole = this.mapRole(u.roles[0]);
      this.isAdmin = this.auth.hasRole('Administrador');
    }
    this.auth.currentUser$.subscribe(user => {
      if (user) {
        this.userName = `${user.firstname} ${user.lastname}`;
        this.userRole = this.mapRole(user.roles[0]);
        this.isAdmin = this.auth.hasRole('Administrador');
      } else {
        this.userName = 'Usuario';
        this.userRole = 'Invitado';
        this.isAdmin = false;
      }
    });

    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
    this.periodSvc.fetchAndSetFromBackend().subscribe();
    this.periodSvc.listAll().subscribe(list => {
      this.periodOptions = (list || []).map(p => p.name);
    });
  }

  toggleProfile() { this.isProfileOpen = !this.isProfileOpen; }
  logout() { this.isProfileOpen = false; this.auth.logout(); }
  onChangePeriod(p: string) { this.periodSvc.setActivePeriod(p); }

  private mapRole(role: string): string {
    if (!role) return 'Usuario';
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
    return roleMap[role] || role;
  }
}
