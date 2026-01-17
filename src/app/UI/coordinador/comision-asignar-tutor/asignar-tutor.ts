import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-comision-asignar-tutor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-tutor.html'
})
export class ComisionAsignarTutorComponent implements OnInit {
  // Selectores
  carreras: Array<{ id: number; nombre: string }> = [];
  docentes: Array<{ id_user: number; fullname: string; email?: string | null }> = [];
  estudiantes: Array<{ id_user: number; fullname: string; career_id?: number | null; career_name?: string | null; suggested_tutor?: string | null }> = [];
  asignados: Array<{ id_user: number; fullname: string; career_id?: number | null; career_name?: string | null; tutor_id?: number | null; tutor_name?: string | null }> = [];
  periodos: Array<{ id_academic_periods: number; name: string }> = [];
  activePeriodName: string | null = null;
  activePeriodId: number | null = null;

  carreraId: number | null = null;
  periodoId: number | null = null;
  estudianteId: number | null = null;
  tutorId: number | null = null;

  // UI
  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCarreras();
    this.cargarPeriodos();
    this.cargarPeriodoActivo();
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
        // Asegurar que exista en la lista sin duplicar
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

  cargarEstudiantes() {
    if (!Number.isFinite(Number(this.periodoId))) {
      this.estudiantes = [];
      return;
    }
    const params: any = {};
    if (Number.isFinite(Number(this.carreraId))) params.careerId = this.carreraId;
    if (Number.isFinite(Number(this.periodoId))) params.academicPeriodId = this.periodoId;
    this.http.get<any[]>('/api/uic/admin/estudiantes-sin-tutor', { params }).subscribe(rows => {
      this.estudiantes = Array.isArray(rows) ? rows : [];
    });
  }

  cargarAsignados() {
    if (!Number.isFinite(Number(this.periodoId))) {
      this.asignados = [];
      return;
    }
    const params: any = {};
    if (Number.isFinite(Number(this.carreraId))) params.careerId = this.carreraId;
    if (Number.isFinite(Number(this.periodoId))) params.academicPeriodId = this.periodoId;
    this.http.get<any[]>('/api/uic/admin/asignaciones/tutor', { params }).subscribe(rows => {
      this.asignados = Array.isArray(rows) ? rows : [];
    });
  }

  onChangeCarrera() {
    this.estudianteId = null;
    this.cargarEstudiantes();
    this.cargarAsignados();
  }

  onChangePeriodo() {
    this.estudianteId = null;
    this.carreraId = this.carreraId; // no-op to preserve current filter
    this.cargarEstudiantes();
    this.cargarAsignados();
  }

  pickEstudiante(id: number) {
    this.estudianteId = id;
  }

  asignar() {
    this.message = null; this.error = null;
    if (!Number.isFinite(Number(this.periodoId))) {
      this.error = 'Seleccione un período.';
      return;
    }
    const id_user_student = Number(this.estudianteId);
    const tutor_usuario_id = Number(this.tutorId);
    if (!Number.isFinite(id_user_student) || !Number.isFinite(tutor_usuario_id)) {
      this.error = 'Ingrese IDs válidos.';
      return;
    }
    this.loading = true;
    const body: any = { id_user_student, tutor_usuario_id };
    if (Number.isFinite(Number(this.periodoId))) body.academicPeriodId = this.periodoId;
    this.http.put('/api/uic/admin/asignaciones/tutor', body).subscribe({
      next: (resp: any) => {
        this.message = 'Tutor asignado correctamente';
        // refrescar lista por si el estudiante ya no debe aparecer
        this.cargarEstudiantes();
        this.cargarAsignados();
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo asignar el tutor';
      },
      complete: () => { this.loading = false; }
    });
  }
}
