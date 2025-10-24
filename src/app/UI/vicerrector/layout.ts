import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-vicerrector-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html'
})
export class VicerrectorLayout {
  userName = 'Vicerrector';
  userRole = 'Vicerrector';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'V';
  }

  isProfileOpen = false;
  isAdmin = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];

  constructor(private auth: AuthService, private periodSvc: PeriodService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = u.name || this.userName;
      this.userRole = this.mapRole(u.role);
      this.isAdmin = this.auth.hasRole('admin');
    }
    this.auth.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userName = user.name || 'Vicerrector';
        this.userRole = this.mapRole(user.role);
      } else {
        this.userName = 'Vicerrector';
        this.userRole = 'Invitado';
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

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }

  private mapRole(role?: string): string {
    switch (role) {
      case 'vicerrector': return 'Vicerrector';
      default: return 'Usuario';
    }
  }
}
