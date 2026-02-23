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

  constructor(private auth: AuthService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = this.toTitleCase(`${u.firstname || ''} ${u.lastname || ''}`);
      this.userRole = this.mapRole(u.roles[0]);
    }
    this.auth.currentUser$.subscribe((user) => {
      if (user) {
        this.userName = this.toTitleCase(`${user.firstname || ''} ${user.lastname || ''}`);
        this.userRole = this.mapRole(user.roles[0]);
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

  private mapRole(role: string): string {
    if (!role) return 'Usuario';
    
    const roleMap: {[key: string]: string} = {
      'Administrador': 'Administrador',
      'Estudiante': 'Estudiante',
      'Secretaria': 'Secretaría',
      'Tesoreria': 'Tesorería',
      'Coordinador': 'Coordinador',
      'Docente': 'Docente',
      'Vicerrector': 'Vicerrector'
    };
    
    return roleMap[role] || 'Usuario';
  }
}
