import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-secretaria-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html'
})
export class SecretariaLayout implements OnInit {
  isSidebarOpen = true;
  isProfileOpen = false;
  userName = 'Secretaría';
  userRole = 'Secretaría';
  isAdmin = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [];
  // Loading flags
  get periodLoading$() { return this.periodSvc.loadingActive$; }
  get periodListLoading$() { return this.periodSvc.loadingList$; }

  get userInitials(): string {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'S';
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private periodSvc: PeriodService
  ) {
    const u = this.authService.currentUserValue;
    if (u) {
      this.userName = `${u.firstname} ${u.lastname}`;
      this.userRole = this.mapRole(u.roles[0]);
      this.isAdmin = this.authService.hasRole('Administrador');
    }
  }

  ngOnInit(): void {
    // Inicializar datos del usuario
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = `${user.firstname} ${user.lastname}`;
        this.userRole = this.mapRole(user.roles[0]);
      } else {
        this.userName = 'Secretaría';
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

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  logout() {
    this.isProfileOpen = false;
    this.authService.logout();
  }

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }

  private mapRole(role: string): string {
    if (!role) return 'Secretaría';
    const roleMap: {[k:string]: string} = {
      'Administrador': 'Administrador',
      'Estudiante': 'Estudiante',
      'Secretaria': 'Secretaría',
      'Tesoreria': 'Tesorería',
      'Coordinador': 'Coordinador',
      'Docente': 'Docente',
      'Vicerrector': 'Vicerrector'
    };
    return roleMap[role] || 'Secretaría';
  }
}