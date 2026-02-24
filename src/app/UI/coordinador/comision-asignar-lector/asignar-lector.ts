import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { SearchableSelectComponent } from '../../../core/components/searchable-select.component';

@Component({
  selector: 'app-comision-asignar-lector',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './asignar-lector.html'
})
export class ComisionAsignarLectorComponent implements OnInit {
  // Selectores
  periodos: Array<{ id_academic_periods: number; name: string }> = [];
  carreras: Array<{ id: number; nombre: string }> = [];
  docentes: Array<{ id_user: number; fullname: string; email?: string | null }> = [];
  estudiantes: Array<{ id_user: number; fullname: string; career_id?: number | null; career_name?: string | null; tutor_name?: string | null }> = [];
  asignados: Array<{ id_user: number; fullname: string; career_id?: number | null; career_name?: string | null; tutor_id?: number | null; tutor_name?: string | null; lector_id?: number | null; lector_name?: string | null }> = [];

  activePeriodId: number | null = null;
  activePeriodName: string | null = null;

  periodoId: number | null = null;
  carreraId: number | null = null;
  estudianteId: number | null = null;
  lectorId: number | null = null;

  // UI
  loading = false;
  message: string | null = null;
  error: string | null = null;

  editingStudentId: number | null = null;
  editingLectorId: number | null = null;
  savingEdit = false;

  get isReadOnly(): boolean {
    const sel = Number(this.periodoId);
    const act = Number(this.activePeriodId);
    if (!Number.isFinite(sel) || !Number.isFinite(act)) return false;
    return sel !== act;
  }

  // Paginación (client-side)
  pageEst = 1;
  pageAsig = 1;
  pageSize = 10;

  get totalPagesEst(): number {
    const total = (this.estudiantes || []).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get totalPagesAsig(): number {
    const total = (this.asignados || []).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get pagedEstudiantes() {
    const start = (this.pageEst - 1) * this.pageSize;
    return (this.estudiantes || []).slice(start, start + this.pageSize);
  }

  get pagedAsignados() {
    const start = (this.pageAsig - 1) * this.pageSize;
    return (this.asignados || []).slice(start, start + this.pageSize);
  }

  setPageEst(p: number) {
    const n = Math.max(1, Math.min(this.totalPagesEst, Math.trunc(Number(p))));
    this.pageEst = n;
  }

  setPageAsig(p: number) {
    const n = Math.max(1, Math.min(this.totalPagesAsig, Math.trunc(Number(p))));
    this.pageAsig = n;
  }

  constructor(private http: HttpClient) { }

  private swalToastError(msg: string) {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: msg,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
  }

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

  private toValidId(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private tryAutoSelectActivePeriod() {
    const act = this.toValidId(this.activePeriodId);
    if (!act) return;
    const name = this.activePeriodName || String(act);
    this.upsertPeriodo({ id_academic_periods: act, name });
    if (!this.toValidId(this.periodoId)) {
      this.periodoId = act;
      this.onChangePeriodo();
    }
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarPeriodoActivo();
    this.cargarDocentes();
  }

  private upsertPeriodo(p: { id_academic_periods: number; name: string }) {
    if (!Number.isFinite(Number(p?.id_academic_periods))) return;
    const id = Number(p.id_academic_periods);
    const idx = this.periodos.findIndex(x => Number(x.id_academic_periods) === id);
    if (idx >= 0) {
      this.periodos[idx] = { id_academic_periods: id, name: String(p.name || this.periodos[idx].name || '') };
    } else {
      this.periodos = [{ id_academic_periods: id, name: String(p.name || '') }, ...(this.periodos || [])];
    }
  }

  cargarPeriodos() {
    this.http.get<Array<{ id_academic_periods: number; name: string }>>('/api/settings/periods').subscribe(rows => {
      // Normalizar y evitar duplicados
      const list = Array.isArray(rows) ? rows : [];
      const map = new Map<number, { id_academic_periods: number; name: string }>();
      for (const r of list) {
        const id = Number((r as any)?.id_academic_periods);
        if (!Number.isFinite(id)) continue;
        map.set(id, { id_academic_periods: id, name: String((r as any)?.name || '') });
      }
      this.periodos = Array.from(map.values());
      this.tryAutoSelectActivePeriod();
    });
  }

  cargarPeriodoActivo() {
    this.http.get<any>('/api/settings/active-period').subscribe(val => {
      this.activePeriodName = val && val.name ? String(val.name) : null;
      this.activePeriodId = val && Number.isFinite(Number(val.id_academic_periods)) ? Number(val.id_academic_periods) : null;
      this.tryAutoSelectActivePeriod();
    });
  }

  cargarCarreras() {
    this.http.get<any[]>('/api/uic/admin/carreras').subscribe(rows => {
      this.carreras = this.onlyTecnologiaAndUniqueCarreras(Array.isArray(rows) ? rows : []);
    });
  }

  cargarDocentes() {
    this.http.get<any[]>('/api/uic/admin/docentes').subscribe(rows => {
      const list = Array.isArray(rows) ? rows : [];
      this.docentes = list.map((d: any) => ({
        ...d,
        id_user: Number(d?.id_user),
        fullname: this.toTitleCase(String(d?.fullname || '')),
      }))
        .filter((d: any) => Number.isFinite(Number(d.id_user)) && d.fullname)
        .filter((d: any) => !/^usuario\b/i.test(String(d.fullname || '').trim()));
    });
  }

  cargarEstudiantes() {
    const periodoId = this.toValidId(this.periodoId);
    if (!periodoId) {
      this.estudiantes = [];
      return;
    }
    const params: any = {};
    params.academicPeriodId = periodoId;
    this.http.get<any[]>('/api/uic/admin/estudiantes-sin-lector', { params }).subscribe(rows => {
      this.estudiantes = Array.isArray(rows) ? rows : [];
      this.setPageEst(1);
    });
  }

  cargarAsignados() {
    const periodoId = this.toValidId(this.periodoId);
    if (!periodoId) {
      this.asignados = [];
      return;
    }
    const params: any = {};
    params.academicPeriodId = periodoId;
    this.http.get<any[]>('/api/uic/admin/asignaciones/lector', { params }).subscribe(rows => {
      const list = Array.isArray(rows) ? rows : [];
      this.asignados = list.map((a: any) => ({
        ...a,
        tutor_name: a?.tutor_name != null ? this.toTitleCase(String(a.tutor_name)) : a?.tutor_name,
        lector_name: a?.lector_name != null ? this.toTitleCase(String(a.lector_name)) : a?.lector_name,
        fullname: a?.fullname != null ? this.toTitleCase(String(a.fullname)) : a?.fullname,
      }));
      this.setPageAsig(1);
    });
  }

  startEdit(a: any) {
    if (this.isReadOnly) return;
    this.message = null;
    this.error = null;
    this.editingStudentId = Number(a?.id_user);
    this.editingLectorId = a?.lector_id != null ? Number(a.lector_id) : null;
  }

  cancelEdit() {
    this.editingStudentId = null;
    this.editingLectorId = null;
  }

  saveEdit(a: any) {
    if (this.isReadOnly) {
      this.error = 'Solo se puede editar en el período activo.';
      return;
    }
    this.message = null;
    this.error = null;
    const pid = this.toValidId(this.periodoId);
    const id_user_student = Number(a?.id_user);
    const lector_usuario_id = Number(this.editingLectorId);
    if (!pid) { this.error = 'Seleccione un período.'; return; }
    if (!Number.isFinite(id_user_student) || !Number.isFinite(lector_usuario_id)) { this.error = 'Seleccione un lector válido.'; return; }
    this.savingEdit = true;
    const body: any = { id_user_student, lector_usuario_id, academicPeriodId: Number(pid) };
    this.http.put('/api/uic/admin/asignaciones/lector', body).subscribe({
      next: () => {
        this.message = 'Lector actualizado correctamente';
        this.cancelEdit();
        this.cargarAsignados();
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el lector';
        this.error = msg;
        this.savingEdit = false;
        this.cancelEdit();
        this.swalToastError(msg);
      },
      complete: () => { this.savingEdit = false; }
    });
  }

  onChangePeriodo() {
    this.estudianteId = null;
    this.cargarEstudiantes();
    this.cargarAsignados();
  }

  pickEstudiante(id: number) { this.estudianteId = id; }

  asignar() {
    if (this.isReadOnly) {
      this.error = 'Solo se puede asignar en el período activo.';
      return;
    }
    this.message = null; this.error = null;
    const periodoId = this.toValidId(this.periodoId);
    if (!periodoId) {
      this.error = 'Seleccione un período.';
      return;
    }
    const id_user_student = Number(this.estudianteId);
    const lector_usuario_id = Number(this.lectorId);
    if (!Number.isFinite(id_user_student) || !Number.isFinite(lector_usuario_id)) { this.error = 'Ingrese IDs válidos.'; return; }
    this.loading = true;
    const body: any = { id_user_student, lector_usuario_id };
    body.academicPeriodId = periodoId;
    this.http.put('/api/uic/admin/asignaciones/lector', body).subscribe({
      next: () => { this.message = 'Lector asignado correctamente'; this.cargarEstudiantes(); this.cargarAsignados(); },
      error: (err) => { this.error = err?.error?.message || 'No se pudo asignar el lector'; },
      complete: () => { this.loading = false; }
    });
  }
}
