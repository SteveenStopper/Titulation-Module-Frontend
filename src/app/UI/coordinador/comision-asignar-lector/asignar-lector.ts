import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-comision-asignar-lector',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(private http: HttpClient) { }

  private toValidId(v: unknown): number | null {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarPeriodoActivo();
    this.cargarCarreras();
    this.cargarDocentes();
    this.cargarEstudiantes();
    this.cargarAsignados();
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
      // Asegurar que el activo esté presente sin duplicarlo
      if (Number.isFinite(Number(this.activePeriodId)) && this.activePeriodName) {
        this.upsertPeriodo({ id_academic_periods: Number(this.activePeriodId), name: this.activePeriodName });
      }
    });
  }

  cargarPeriodoActivo() {
    this.http.get<any>('/api/settings/active-period').subscribe(val => {
      this.activePeriodName = val && val.name ? String(val.name) : null;
      this.activePeriodId = val && Number.isFinite(Number(val.id_academic_periods)) ? Number(val.id_academic_periods) : null;
      if (Number.isFinite(Number(this.activePeriodId))) {
        if (this.activePeriodName) this.upsertPeriodo({ id_academic_periods: Number(this.activePeriodId), name: this.activePeriodName });
        // Auto-seleccionar el período activo si aún no se ha seleccionado
        if (!Number.isFinite(Number(this.periodoId))) {
          this.periodoId = Number(this.activePeriodId);
          this.cargarEstudiantes();
          this.cargarAsignados();
        }
      }
    });
  }

  cargarCarreras() {
    this.http.get<any[]>('/api/uic/admin/carreras').subscribe(rows => {
      this.carreras = Array.isArray(rows) ? rows : [];
    });
  }

  cargarDocentes() {
    this.http.get<any[]>('/api/uic/admin/docentes').subscribe(rows => {
      this.docentes = Array.isArray(rows) ? rows : [];
    });
  }

  cargarEstudiantes() {
    const periodoId = this.toValidId(this.periodoId);
    if (!periodoId) {
      this.estudiantes = [];
      return;
    }
    const params: any = {};
    const carreraId = this.toValidId(this.carreraId);
    if (carreraId) params.careerId = carreraId;
    params.academicPeriodId = periodoId;
    this.http.get<any[]>('/api/uic/admin/estudiantes-sin-lector', { params }).subscribe(rows => {
      this.estudiantes = Array.isArray(rows) ? rows : [];
    });
  }

  cargarAsignados() {
    const periodoId = this.toValidId(this.periodoId);
    if (!periodoId) {
      this.asignados = [];
      return;
    }
    const params: any = {};
    const carreraId = this.toValidId(this.carreraId);
    if (carreraId) params.careerId = carreraId;
    params.academicPeriodId = periodoId;
    this.http.get<any[]>('/api/uic/admin/asignaciones/lector', { params }).subscribe(rows => {
      this.asignados = Array.isArray(rows) ? rows : [];
    });
  }

  onChangePeriodo() {
    this.estudianteId = null;
    this.cargarEstudiantes();
    this.cargarAsignados();
  }

  onChangeCarrera() {
    this.estudianteId = null;
    this.cargarEstudiantes();
    this.cargarAsignados();
  }

  pickEstudiante(id: number) { this.estudianteId = id; }

  asignar() {
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
