import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-administrador-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class AdministradorLayout {
  userName = 'Administrador';
  userRole = 'Administrador';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'A';
  }

  isProfileOpen = false;

  constructor(private auth: AuthService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = u.name || this.userName;
      this.userRole = this.mapRole(u.role);
    }
    this.auth.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userName = user.name || 'Administrador';
        this.userRole = this.mapRole(user.role);
      } else {
        this.userName = 'Administrador';
        this.userRole = 'Invitado';
      }
    });
  }

  toggleProfile() { this.isProfileOpen = !this.isProfileOpen; }

  logout() {
    this.isProfileOpen = false;
    this.auth.logout();
  }

  private mapRole(role?: string): string {
    switch (role) {
      case 'admin': return 'Administrador';
      default: return 'Usuario';
    }
  }
}
