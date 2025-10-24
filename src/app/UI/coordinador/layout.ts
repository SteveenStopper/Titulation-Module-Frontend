import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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

  constructor(private router: Router, private auth: AuthService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = u.name || this.userName;
      this.userRole = this.mapRole(u.role);
      this.isAdmin = this.auth.hasRole('admin');
    }
    this.auth.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userName = user.name || 'Coordinador';
        this.userRole = this.mapRole(user.role);
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

  private mapRole(role?: string): string {
    switch (role) {
      case 'coordinator': return 'Coordinador';
      default: return 'Usuario';
    }
  }
}
