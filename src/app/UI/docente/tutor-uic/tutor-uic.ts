import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TutorAvanceService, FilaAvance, ParcialEstado } from '../../../core/services/tutor-avance.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tutor-uic-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tutor-uic.html',
  styleUrl: './tutor-uic.scss'
})
export class TutorUicDocente {
  tab: 'avance' = 'avance';
  estudiantes: FilaAvance[] = [];
  private allEstudiantes: FilaAvance[] = [];

  carreraFiltro = '';

  get carrerasDisponibles(): string[] {
    const set = new Set<string>();
    for (const e of this.allEstudiantes || []) {
      const c = String((e as any)?.carrera || '').trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private applyFilters() {
    const c = String(this.carreraFiltro || '').trim();
    if (!c) {
      this.estudiantes = this.allEstudiantes;
      return;
    }
    this.estudiantes = (this.allEstudiantes || []).filter(e => String((e as any)?.carrera || '').trim() === c);
  }
  private tutorId = '';
  private isAdmin = false;
  showToast = false;
  toastMsg = '';
  toastOk = true;

  constructor(private avanceSvc: TutorAvanceService, private auth: AuthService) {
    const me = this.auth.currentUserValue?.id_user;
    const roles = (this.auth.currentUserValue as any)?.roles;
    const role = (this.auth.currentUserValue as any)?.role;
    const list = Array.isArray(roles) ? roles.map(String) : (role ? [String(role)] : []);
    this.isAdmin = list.includes('Administrador') || list.includes('Admin') || list.includes('ADMIN');
    if (Number.isFinite(Number(me))) {
      this.tutorId = String(me);
      this.avanceSvc.syncFromBackend(this.tutorId);
      this.avanceSvc.getListaTutor(this.tutorId).subscribe(lista => {
        this.allEstudiantes = Array.isArray(lista) ? lista : [];
        this.applyFilters();
      });
    } else {
      this.tutorId = '';
      this.estudiantes = [];
      this.allEstudiantes = [];
    }
  }

  onChangeCarrera() {
    this.applyFilters();
  }

  promedio(e: { p1: { nota: number|null }, p2: { nota: number|null }, p3: { nota: number|null } }): number | null {
    const vals = [e.p1.nota, e.p2.nota, e.p3.nota].filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100) / 100;
  }

  clampNota(e: any, key: 'p1'|'p2'|'p3') {
    let v = e[key].nota;
    if (v === null || v === undefined || v === '') return;
    if (v < 0) e[key].nota = 0;
    if (v > 10) e[key].nota = 10;
  }

  private previoCompleto(e: any, key: 'p1'|'p2'|'p3'): boolean {
    if (key === 'p1') return true;
    if (key === 'p2') return e.p1.estado === 'published';
    if (key === 'p3') return e.p2.estado === 'published';
    return false;
  }

  puedeEditar(e: any, key: 'p1'|'p2'|'p3'): boolean {
    if (this.isAdmin) return e[key].estado === 'editing';
    return e[key].estado === 'editing';
  }

  puedeMostrarEditar(e: any, key: 'p1'|'p2'|'p3'): boolean {
    if (this.isAdmin) return (e[key].estado === 'saved' || e[key].estado === 'published');
    return e[key].estado === 'saved';
  }

  guardar(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    this.clampNota(e, key);
    this.avanceSvc.guardarParcial(this.tutorId, e.alumnoId, key, { nota: e[key].nota, obs: e[key].obs })
      .subscribe({
        next: () => { this.toastOk = true; this.toastMsg = 'Guardado correctamente'; this.showToast = true; setTimeout(()=> this.showToast=false, 2500); },
        error: () => { this.toastOk = false; this.toastMsg = 'No se pudo guardar'; this.showToast = true; setTimeout(()=> this.showToast=false, 3500); }
      });
  }

  editar(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    if (e[key].estado === 'published') return;
    e[key].estado = 'editing';
  }

  puedePublicar(e: FilaAvance, key: 'p1'|'p2'|'p3'): boolean {
    if (this.isAdmin) return false;
    return e[key].nota !== null && e[key].estado !== 'published';
  }

  publicarParcial(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    if (!this.puedePublicar(e, key)) return;
    this.clampNota(e, key);
    const chain = e[key].estado === 'editing'
      ? this.avanceSvc.guardarParcial(this.tutorId, e.alumnoId, key, { nota: e[key].nota, obs: e[key].obs })
      : undefined;
    const doPublish = () => this.avanceSvc.publicarParcial(this.tutorId, e.alumnoId, key)?.subscribe({
      next: () => { this.toastOk = true; this.toastMsg = 'Publicado'; this.showToast = true; setTimeout(()=> this.showToast=false, 2500); },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo publicar'; this.showToast = true; setTimeout(()=> this.showToast=false, 3500); }
    });
    if (chain) {
      chain.subscribe({ next: () => doPublish(), error: () => { this.toastOk=false; this.toastMsg='No se pudo publicar'; this.showToast=true; setTimeout(()=> this.showToast=false, 3500); } });
    } else {
      doPublish();
    }
  }

  verDocumento(e: FilaAvance) {
    if (!e?.alumnoId) return;
    if (!Number.isFinite(Number(e?.documentoId))) return;
    this.avanceSvc.downloadInformeFinal(String(e.alumnoId)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        this.toastOk = false;
        this.toastMsg = 'No autorizado para ver el documento';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3500);
      }
    });
  }
}
