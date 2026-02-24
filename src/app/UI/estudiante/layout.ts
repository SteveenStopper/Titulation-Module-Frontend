import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';
import { ModalityService, Modality } from '../../services/modality.service';
import { MeService } from '../../services/me.service';

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
  isInsideUIC = false;
  isInsideComplexivo = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [];
  // Loading flags
  get periodLoading$() { return this.periodSvc.loadingActive$; }
  get periodListLoading$() { return this.periodSvc.loadingList$; }
  // Modalidad actual (para visibilidad en sidebar)
  modality: Modality = null;

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

  constructor(private router: Router, private auth: AuthService, private periodSvc: PeriodService, private modalitySvc: ModalityService, private me: MeService) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = this.toTitleCase(u.name || this.userName);
      this.userRole = this.pickDisplayRole(u.roles);
    }
    // Suscribirse para reflejar cambios si cambian en runtime
    this.auth.currentUser$.subscribe((user: any) => {
      if (user) {
        this.userName = this.toTitleCase(user.name || 'Estudiante');
        this.userRole = this.pickDisplayRole(user.roles);
      } else {
        this.userName = 'Estudiante';
        this.userRole = 'Invitado';
      }
    });

    // Auto-cerrar grupos al salir de sus rutas
    this.router.events.subscribe(evt => {
      if (evt instanceof NavigationEnd) {
        const url = evt.urlAfterRedirects || evt.url;
        this.isInsideUIC = /\/estudiante\/(cronograma-uic|avance)(\/|$)/.test(url);
        this.isInsideComplexivo = /\/estudiante\/(cronograma-complexivo|tutorias)(\/|$)/.test(url);
        this.uicOpen = this.isInsideUIC;
        this.complexivoOpen = this.isInsideComplexivo;
      }
    });
    // Sincronizar datos de perfil y período activo desde backend
    this.me.getProfile().subscribe((res) => {
      const u = res?.user;
      if (u) {
        const fullname = [u.firstname, u.lastname].filter(Boolean).join(' ').trim();
        if (fullname) this.userName = this.toTitleCase(fullname);
      }
      const ap = res?.activePeriod;
      if (!this.periodSvc.getActivePeriod() && ap?.name) {
        this.periodSvc.setActivePeriod(String(ap.name));
      }
    });

    // Sincronizar período activo global (backend) y modalidad
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
    this.periodSvc.fetchAndSetFromBackend().subscribe();
    this.periodSvc.listAll().subscribe(list => {
      this.periodOptions = (list || []).map(p => p.name);
    });
    this.modalitySvc.modality$.subscribe(mod => {
      this.modality = mod;
    });
    this.modalitySvc.refresh();
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

  private pickDisplayRole(roles?: string[]): string {
    if (!Array.isArray(roles) || roles.length === 0) return 'Usuario';
    // Prioridad similar al AuthService
    const priority = [
      'Administrador', 'Tesoreria', 'Secretaria', 'Coordinador', 'Docente', 'Vicerrector', 'Ingles', 'Vinculacion_Practicas', 'Estudiante'
    ];
    const found = priority.find(r => roles.includes(r)) || roles[0];
    return this.mapRoleName(found);
  }

  private mapRoleName(role: string): string {
    switch (role) {
      case 'Administrador': return 'Administrador';
      case 'Estudiante': return 'Estudiante';
      case 'Tesoreria': return 'Tesorería';
      case 'Secretaria': return 'Secretaría';
      case 'Coordinador': return 'Coordinador';
      case 'Docente': return 'Docente';
      case 'Vicerrector': return 'Vicerrector';
      case 'Ingles': return 'Inglés';
      case 'Vinculacion_Practicas': return 'Vinculación/Prácticas';
      // Compatibilidad con nombres antiguos en inglés
      case 'student': return 'Estudiante';
      case 'coordinator': return 'Coordinador';
      case 'teacher': return 'Docente';
      case 'treasury': return 'Tesorería';
      case 'secretary': return 'Secretaría';
      default: return 'Usuario';
    }
  }
}
