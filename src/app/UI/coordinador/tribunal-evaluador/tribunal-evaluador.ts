import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tribunal-evaluador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tribunal-evaluador.html',
  styleUrl: './tribunal-evaluador.scss'
})
export class TribunalEvaluador {
  // Opciones (desde backend)
  periodOptions: Array<{ id_academic_periods: number; name: string }> = [];
  carreraOptions: Array<{ id: number; nombre: string }> = [];
  docentes: Array<{ id_user: number; fullname: string }> = [];
  estudiantesUIC: Array<{ id: number; nombre: string; tutor_id?: number | null; tutor?: string | null }> = [];
  tribunalAsignado: Array<{ id_user: number; fullname: string; career_id?: number | null; career_name?: string | null; presidente?: string | null; secretario?: string | null; vocal?: string | null }> = [];

  private lectorByStudentId = new Map<number, number>();
  private lectorNameByStudentId = new Map<number, string>();

  editingStudentId: number | null = null;
  editingPresidentId: number | null = null;
  editingSecretaryId: number | null = null;
  editingVocalId: number | null = null;
  savingEdit = false;

  // Roles fijos (según requerimiento)
  roles: string[] = ['Integrante del Tribunal 2', 'Integrante del Tribunal 3'];

  model: {
    periodo?: number;
    carrera?: number;
    estudianteId?: number;
    miembros: Array<{ rol?: string; docente?: number }>;
  } = {
      miembros: [],
    };

  errors: string[] = [];

  // Paginación (client-side)
  pageAsig = 1;
  pageSizeAsig = 10;

  get totalPagesAsig(): number {
    const total = (this.tribunalAsignado || []).length;
    return Math.max(1, Math.ceil(total / this.pageSizeAsig));
  }

  get pagedTribunalAsignado() {
    const start = (this.pageAsig - 1) * this.pageSizeAsig;
    return (this.tribunalAsignado || []).slice(start, start + this.pageSizeAsig);
  }

  setPageAsig(p: number) {
    const n = Math.max(1, Math.min(this.totalPagesAsig, Math.trunc(Number(p))));
    this.pageAsig = n;
  }

  get hasStudents(): boolean {
    return Array.isArray(this.estudiantesUIC) && this.estudiantesUIC.length > 0;
  }

  get selectedLectorName(): string | null {
    const id = Number(this.model.estudianteId);
    if (!Number.isFinite(id)) return null;
    const name = this.lectorNameByStudentId.get(id);
    return name ? String(name) : null;
  }

  private getSelectedLectorId(): number | null {
    const id = Number(this.model.estudianteId);
    if (!Number.isFinite(id)) return null;
    const lectorId = Number(this.lectorByStudentId.get(id));
    return Number.isFinite(lectorId) ? lectorId : null;
  }

  get canGuardar(): boolean {
    if (!Number.isFinite(Number(this.model.periodo))) return false;
    if (!Number.isFinite(Number(this.model.estudianteId))) return false;
    // Integrante 1 es fijo (Lector). Se seleccionan solo 2 y 3.
    if (!Array.isArray(this.model.miembros) || this.model.miembros.length !== 2) return false;
    const lectorId = this.getSelectedLectorId();
    if (!Number.isFinite(Number(lectorId))) return false;
    const roles = new Set<string>();
    const docentes = new Set<number>();
    const tutorId = this.getSelectedTutorId();
    if (lectorId) docentes.add(Number(lectorId));
    for (const m of this.model.miembros) {
      const r = String(m?.rol || '').trim();
      if (!r) return false;
      if (roles.has(r)) return false;
      roles.add(r);
      if (!Number.isFinite(Number(m?.docente))) return false;
      const did = Number(m.docente);
      if (docentes.has(did)) return false;
      docentes.add(did);
      if (tutorId && did === tutorId) return false;
    }
    return true;
  }

  constructor(private http: HttpClient) { }

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

  private normalizeText(s: string): string {
    return String(s || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private onlyTecnologiaAndUniqueCarreras(list: Array<{ id: number; nombre: string }>): Array<{ id: number; nombre: string }> {
    const seen = new Set<string>();
    const out: Array<{ id: number; nombre: string }> = [];
    for (const c of Array.isArray(list) ? list : []) {
      const id = Number((c as any)?.id);
      const nombre = String((c as any)?.nombre || '');
      if (!Number.isFinite(id) || !nombre.trim()) continue;
      const keyName = this.normalizeText(nombre);
      if (!keyName.includes('TECNOLOGIA')) continue;
      if (seen.has(keyName)) continue;
      seen.add(keyName);
      out.push({ id, nombre });
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  ngOnInit() {
    // Períodos
    this.http.get<Array<{ id_academic_periods: number; name: string }>>('/api/settings/periods').subscribe(rows => {
      this.periodOptions = Array.isArray(rows) ? rows : [];
    });
    // Carreras
    this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras').subscribe(rows => {
      this.carreraOptions = this.onlyTecnologiaAndUniqueCarreras(Array.isArray(rows) ? rows : []);
    });
    // Docentes
    this.http.get<Array<{ id_user: number; fullname: string }>>('/api/uic/admin/docentes').subscribe(rows => {
      const list = Array.isArray(rows) ? rows : [];
      this.docentes = list
        .map((d: any) => ({ id_user: Number(d?.id_user), fullname: this.toTitleCase(String(d?.fullname || '')) }))
        .filter((d: any) => Number.isFinite(Number(d.id_user)) && d.fullname);
    });
    this.refreshEstudiantes();
    this.refreshLectorMap();
    this.refreshTribunalAsignado();
  }

  onChange() {
    this.errors = [];
    if (this.model.miembros.length > 2) this.errors.push('Máximo 2 integrantes (Integrante 2 y 3).');

    // Refrescar listados cuando haya filtros
    this.refreshEstudiantes();
    this.refreshLectorMap();
    this.refreshTribunalAsignado();
  }

  addMiembro() {
    if (!this.hasStudents) return;
    if (this.model.miembros.length >= 2) return;
    this.model.miembros.push({});
    this.onChange();
  }

  removeMiembro(i: number) {
    this.model.miembros.splice(i, 1);
    this.onChange();
  }

  private refreshLectorMap() {
    this.lectorByStudentId = new Map();
    this.lectorNameByStudentId = new Map();

    if (!Number.isFinite(Number(this.model.periodo))) return;
    const params: any = { academicPeriodId: Number(this.model.periodo) };
    if (Number.isFinite(Number(this.model.carrera))) params.careerId = Number(this.model.carrera);

    this.http.get<any[]>('/api/uic/admin/asignaciones/lector', { params }).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        for (const r of list) {
          const sid = Number(r?.id_user);
          const lid = r?.lector_id != null ? Number(r.lector_id) : null;
          if (!Number.isFinite(sid) || !Number.isFinite(Number(lid))) continue;
          this.lectorByStudentId.set(sid, Number(lid));
          const lname = r?.lector_name != null ? this.toTitleCase(String(r.lector_name)) : null;
          if (lname) this.lectorNameByStudentId.set(sid, lname);
        }

        this.refreshTribunalAsignado();

        // Si ya hay estudiante seleccionado pero no tiene lector, avisar en errores
        const lectorId = this.getSelectedLectorId();
        if (Number.isFinite(Number(this.model.estudianteId)) && !Number.isFinite(Number(lectorId))) {
          if (!this.errors.includes('El estudiante no tiene lector asignado.')) {
            this.errors = [...(this.errors || []), 'El estudiante no tiene lector asignado.'];
          }
        }
      },
      error: () => {
        // no bloquear UI, solo limpiar
        this.lectorByStudentId = new Map();
        this.lectorNameByStudentId = new Map();
        this.refreshTribunalAsignado();
      }
    });
  }

  private refreshEstudiantes() {
    if (!Number.isFinite(Number(this.model.periodo))) {
      this.estudiantesUIC = [];
      return;
    }
    const params: any = { academicPeriodId: this.model.periodo };
    if (Number.isFinite(Number(this.model.carrera))) params.careerId = this.model.carrera;
    this.http.get<any[]>('/api/uic/admin/estudiantes-uic-sin-tribunal', { params }).subscribe(rows => {
      const list = Array.isArray(rows) ? rows : [];
      this.estudiantesUIC = list.map((r: any) => ({
        id: Number(r.id_user),
        nombre: String(r.fullname),
        tutor_id: r.tutor_id != null ? Number(r.tutor_id) : null,
        tutor: r.tutor_name != null ? String(r.tutor_name) : null,
      }));
    });
  }

  private refreshTribunalAsignado() {
    if (!Number.isFinite(Number(this.model.periodo))) {
      this.tribunalAsignado = [];
      return;
    }
    const params: any = { academicPeriodId: this.model.periodo };
    if (Number.isFinite(Number(this.model.carrera))) params.careerId = this.model.carrera;
    this.http.get<any[]>('/api/uic/admin/asignaciones/tribunal', { params }).subscribe(rows => {
      const list = Array.isArray(rows) ? rows : [];
      this.tribunalAsignado = list.map((a: any) => {
        const sid = Number(a?.id_user);
        const lectorName = Number.isFinite(sid) ? this.lectorNameByStudentId.get(sid) : null;
        return {
          ...a,
          fullname: a?.fullname != null ? this.toTitleCase(String(a.fullname)) : a?.fullname,
          presidente: lectorName ? String(lectorName) : (a?.presidente != null ? this.toTitleCase(String(a.presidente)) : a?.presidente),
          secretario: a?.secretario != null ? this.toTitleCase(String(a.secretario)) : a?.secretario,
          vocal: a?.vocal != null ? this.toTitleCase(String(a.vocal)) : a?.vocal,
        };
      });
      this.setPageAsig(1);
    });
  }

  startEditAsignado(a: any) {
    this.editingStudentId = Number(a?.id_user);
    // Integrante 1 es el lector -> no editable
    this.editingPresidentId = a?.presidente_id != null ? Number(a.presidente_id) : null;
    this.editingSecretaryId = a?.secretario_id != null ? Number(a.secretario_id) : null;
    this.editingVocalId = a?.vocal_id != null ? Number(a.vocal_id) : null;
  }

  cancelEditAsignado() {
    this.editingStudentId = null;
    this.editingPresidentId = null;
    this.editingSecretaryId = null;
    this.editingVocalId = null;
  }

  saveEditAsignado(a: any) {
    const studentId = Number(a?.id_user);
    if (!Number.isFinite(studentId)) return;
    if (!Number.isFinite(Number(this.model.periodo))) return;
    if (!Number.isFinite(Number(this.model.carrera))) return;
    const p = Number(this.editingPresidentId);
    const s = Number(this.editingSecretaryId);
    const v = Number(this.editingVocalId);
    // Integrante 1 no se edita
    if (!Number.isFinite(p)) return;
    if (!Number.isFinite(s) || !Number.isFinite(v)) return;
    if (p === s || p === v || s === v) return;

    this.savingEdit = true;
    const body: any = {
      id_user_student: studentId,
      id_president: p,
      id_secretary: s,
      id_vocal: v,
      academicPeriodId: Number(this.model.periodo),
      careerId: Number(this.model.carrera),
    };
    this.http.post('/api/tribunal/assignments', body).subscribe({
      next: () => {
        this.cancelEditAsignado();
        this.refreshEstudiantes();
        this.refreshTribunalAsignado();
      },
      error: (err) => {
        this.errors = [err?.error?.message || 'No se pudo actualizar el tribunal'];
      },
      complete: () => { this.savingEdit = false; }
    });
  }

  get selectedTutor(): string | null {
    const e = this.estudiantesUIC.find(x => x.id === this.model.estudianteId);
    return (e?.tutor || null) as any;
  }

  private getSelectedTutorId(): number | null {
    const e = this.estudiantesUIC.find(x => x.id === this.model.estudianteId);
    return e?.tutor_id != null ? Number(e.tutor_id) : null;
  }

  private validate(): boolean {
    const errs: string[] = [];
    if (!this.model.estudianteId) errs.push('Seleccione un estudiante.');
    if (!Number.isFinite(Number(this.model.periodo))) errs.push('Seleccione un período.');
    if (!Number.isFinite(Number(this.model.carrera))) errs.push('Seleccione una carrera.');
    const lectorId = this.getSelectedLectorId();
    if (!Number.isFinite(Number(lectorId))) errs.push('El estudiante no tiene lector asignado.');
    if (this.model.miembros.length !== 2) errs.push('Debe registrar 2 integrantes (Integrante 2 y 3).');
    const roles = new Set<string>();
    const docentes = new Set<number>();
    if (Number.isFinite(Number(lectorId))) docentes.add(Number(lectorId));
    this.model.miembros.forEach((m, idx) => {
      const r = m.rol?.trim();
      if (!r) errs.push(`Fila ${idx + 1}: Seleccione un rol.`);
      else {
        if (roles.has(r)) errs.push(`Rol duplicado: ${r}.`);
        roles.add(r);
      }
      if (!m.docente) errs.push(`Fila ${idx + 1}: Seleccione un docente.`);
      if (m.docente) {
        const did = Number(m.docente);
        if (docentes.has(did)) errs.push('No se puede repetir docentes (incluye el lector).');
        docentes.add(did);
      }
      const tutorId = this.getSelectedTutorId();
      if (m.docente && tutorId && Number(m.docente) === Number(tutorId)) {
        errs.push(`Fila ${idx + 1}: El tutor no puede ser miembro del tribunal.`);
      }
    });
    if (roles.size !== this.model.miembros.length) errs.push('Roles duplicados.');
    this.errors = errs;
    return errs.length === 0;
  }

  guardar() {
    if (!this.validate()) return;
    const lectorId = this.getSelectedLectorId();
    if (!Number.isFinite(Number(lectorId))) {
      this.errors = ['El estudiante no tiene lector asignado.'];
      return;
    }

    // Integrante 1 fijo = Lector. Integrante 2 y 3 se asignan aquí.
    const getIdByRol = (rol: 'Integrante del Tribunal 2' | 'Integrante del Tribunal 3') => {
      const m = this.model.miembros.find(x => String(x.rol || '') === rol);
      return m?.docente ? Number(m.docente) : undefined;
    };
    const body: any = {
      id_user_student: Number(this.model.estudianteId),
      id_president: Number(lectorId),
      id_secretary: getIdByRol('Integrante del Tribunal 2'),
      id_vocal: getIdByRol('Integrante del Tribunal 3'),
    };
    if (Number.isFinite(Number(this.model.periodo))) body.academicPeriodId = this.model.periodo;
    if (Number.isFinite(Number(this.model.carrera))) body.careerId = this.model.carrera;
    this.http.post('/api/tribunal/assignments', body).subscribe({
      next: () => {
        this.model.estudianteId = undefined;
        this.model.miembros = [];
        this.errors = [];
        this.refreshEstudiantes();
        this.refreshTribunalAsignado();
      },
      error: (err) => {
        this.errors = [err?.error?.message || 'No se pudo guardar la asignación'];
      }
    });
  }
}
