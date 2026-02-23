import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-docente-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class DocenteLayout {
  userName = 'Docente';
  userRole = 'Docente';
  get userInitials() {
    const parts = this.userName.split(' ').filter(Boolean);
    return (parts[0]?.[0] || '').concat(parts[1]?.[0] || '').toUpperCase() || 'D';
  }

  isProfileOpen = false;
  isTutorUicOpen = false;
  isComplexivoOpen = false;
  isAdmin = false;

  canTutorUic = true;
  canComplexivo = true;
  canLector = true;
  canVeedor = true;
  canTribunal = true;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [];
  // Loading flags
  get periodLoading$() { return this.periodSvc.loadingActive$; }
  get periodListLoading$() { return this.periodSvc.loadingList$; }

  private destroyed$ = new Subject<void>();

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

  constructor(private auth: AuthService, private periodSvc: PeriodService, private http: HttpClient, private router: Router) {
    const u = this.auth.currentUserValue;
    if (u) {
      this.userName = this.toTitleCase(`${u.firstname || ''} ${u.lastname || ''}`);
      this.userRole = this.mapRole(u.roles[0]);
      this.isAdmin = this.auth.hasRole('Administrador');
    }
    this.auth.currentUser$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((user) => {
      if (user) {
        this.userName = this.toTitleCase(`${user.firstname || ''} ${user.lastname || ''}`);
        this.userRole = this.mapRole(user.roles[0]);
        this.isAdmin = this.auth.hasRole('Administrador');
      } else {
        this.userName = 'Docente';
        this.userRole = 'Invitado';
      }
    });

    this.refreshFeatureFlags();
    this.auth.currentUser$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((u) => {
        if (!u) {
          this.canTutorUic = false;
          this.canComplexivo = false;
          this.canLector = false;
          this.canVeedor = false;
          this.canTribunal = false;
          return;
        }
        this.refreshFeatureFlags();
      });

    // Sincronizar período activo global
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(p => this.activePeriod = p);

    if (this.auth.currentUserValue) {
      this.periodSvc.fetchAndSetFromBackend().pipe(takeUntil(this.destroyed$)).subscribe();
    }
    // Cargar periodos desde backend
    if (this.auth.currentUserValue) {
      this.periodSvc.listAll().pipe(takeUntil(this.destroyed$)).subscribe(list => {
        this.periodOptions = (list || []).map(p => p.name);
      });
    }

    // Mantener abierto el grupo Tutor UIC cuando estás dentro de sus rutas
    this.router.events
      .pipe(takeUntil(this.destroyed$))
      .subscribe(evt => {
        if (!(evt instanceof NavigationEnd)) return;
        const url = evt.urlAfterRedirects || evt.url;
        const insideTutorUic = /^\/docente\/tutor-uic(\/|$)/.test(url);
        if (insideTutorUic) this.isTutorUicOpen = true;
      });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private refreshFeatureFlags() {
    if (!this.auth.currentUserValue) return;
    this.isAdmin = this.auth.hasRole('Administrador');
    if (this.isAdmin) {
      this.canTutorUic = true;
      this.canComplexivo = true;
      this.canLector = true;
      this.canVeedor = true;
      this.canTribunal = true;
      return;
    }

    this.http.get<any[]>('/api/docente/uic/estudiantes').subscribe({
      next: (list) => this.canTutorUic = Array.isArray(list) && list.length > 0,
      error: () => this.canTutorUic = false,
    });

    this.http.get<any[]>('/api/docente/complexivo/mis-materias').subscribe({
      next: (list) => {
        const rows = Array.isArray(list) ? list : [];
        this.canComplexivo = rows.some((m: any) => !!m?.asignadoADocente) || rows.length > 0;
      },
      error: () => this.canComplexivo = false,
    });

    this.http.get<any[]>('/api/docente/lector/estudiantes').subscribe({
      next: (list) => this.canLector = Array.isArray(list) && list.length > 0,
      error: () => this.canLector = false,
    });

    this.http.get<any[]>('/api/docente/veedor/estudiantes').subscribe({
      next: (list) => this.canVeedor = Array.isArray(list) && list.length > 0,
      error: () => this.canVeedor = false,
    });

    this.http.get<any[]>('/api/docente/tribunal-evaluador/estudiantes').subscribe({
      next: (list) => this.canTribunal = Array.isArray(list) && list.length > 0,
      error: () => this.canTribunal = false,
    });
  }

  toggleProfile() {
    this.isProfileOpen = !this.isProfileOpen;
  }

  toggleTutorUic() {
    this.isTutorUicOpen = !this.isTutorUicOpen;
  }

  toggleComplexivo() {
    this.isComplexivoOpen = !this.isComplexivoOpen;
  }

  logout() {
    this.isProfileOpen = false;
    this.auth.logout();
  }

  onChangePeriod(p: string) {
    this.periodSvc.setActivePeriod(p);
  }

  private mapRole(role: string): string {
    if (!role) return 'Docente';
    
    const roleMap: {[key: string]: string} = {
      'Administrador': 'Administrador',
      'Estudiante': 'Estudiante',
      'Secretaria': 'Secretaría',
      'Tesoreria': 'Tesorería',
      'Coordinador': 'Coordinador',
      'Docente': 'Docente',
      'Vicerrector': 'Vicerrector'
    };
    
    return roleMap[role] || 'Docente';
  }
}
