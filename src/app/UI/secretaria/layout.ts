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
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];

  get userInitials(): string {
    return this.userName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private periodSvc: PeriodService
  ) {
    const u = this.authService.currentUserValue;
    if (u) {
      this.isAdmin = this.authService.hasRole('admin');
    }
  }

  ngOnInit(): void {
    // Inicializar datos del usuario
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.userName = user.name || 'Secretaría';
        this.userRole = 'Secretaría';
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
    this.authService.logout();
  }

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }
}