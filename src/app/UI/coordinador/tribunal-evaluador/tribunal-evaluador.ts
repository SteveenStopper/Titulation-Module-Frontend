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

  // Roles fijos (según requerimiento)
  roles: string[] = ['Integrante del Tribunal 1', 'Integrante del Tribunal 2', 'Integrante del Tribunal 3'];

  model: {
    periodo?: number;
    carrera?: number;
    estudianteId?: number;
    miembros: Array<{ rol?: string; docente?: number }>;
  } = {
      miembros: [],
    };

  errors: string[] = [];

  get canGuardar(): boolean {
    if (!Number.isFinite(Number(this.model.periodo))) return false;
    if (!Number.isFinite(Number(this.model.estudianteId))) return false;
    if (!Array.isArray(this.model.miembros) || this.model.miembros.length !== 3) return false;
    const roles = new Set<string>();
    const docentes = new Set<number>();
    const tutorId = this.getSelectedTutorId();
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

  ngOnInit() {
    // Períodos
    this.http.get<Array<{ id_academic_periods: number; name: string }>>('/api/settings/periods').subscribe(rows => {
      this.periodOptions = Array.isArray(rows) ? rows : [];
    });
    // Carreras
    this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras').subscribe(rows => {
      this.carreraOptions = Array.isArray(rows) ? rows : [];
    });
    // Docentes
    this.http.get<Array<{ id_user: number; fullname: string }>>('/api/uic/admin/docentes').subscribe(rows => {
      this.docentes = Array.isArray(rows) ? rows : [];
    });
    this.refreshEstudiantes();
    this.refreshTribunalAsignado();
  }

  onChange() {
    this.errors = [];
    if (this.model.miembros.length > 3) {
      this.errors.push('Máximo 3 integrantes.');
    }

    // Refrescar listados cuando haya filtros
    this.refreshEstudiantes();
    this.refreshTribunalAsignado();
  }

  addMiembro() {
    if (this.model.miembros.length >= 3) return;
    this.model.miembros.push({});
    this.onChange();
  }

  removeMiembro(i: number) {
    this.model.miembros.splice(i, 1);
    this.onChange();
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
      this.tribunalAsignado = Array.isArray(rows) ? rows : [];
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
    if (this.model.miembros.length !== 3) errs.push('Debe registrar 3 integrantes.');
    const roles = new Set<string>();
    this.model.miembros.forEach((m, idx) => {
      const r = m.rol?.trim();
      if (!r) errs.push(`Fila ${idx + 1}: Seleccione un rol.`);
      else {
        if (roles.has(r)) errs.push(`Rol duplicado: ${r}.`);
        roles.add(r);
      }
      if (!m.docente) errs.push(`Fila ${idx + 1}: Seleccione un docente.`);
      const tutorId = this.getSelectedTutorId();
      if (m.docente && tutorId && Number(m.docente) === Number(tutorId)) {
        errs.push(`Fila ${idx + 1}: El tutor no puede ser miembro del tribunal.`);
      }
    });
    this.errors = errs;
    return errs.length === 0;
  }

  guardar() {
    if (!this.validate()) return;
    // Mapear a presidente/secretario/vocal desde los roles visibles
    const roleMap: Record<string, 'Presidente' | 'Secretario' | 'Vocal'> = {
      'Integrante del Tribunal 1': 'Presidente',
      'Integrante del Tribunal 2': 'Secretario',
      'Integrante del Tribunal 3': 'Vocal',
    };
    const getIdByMapped = (target: 'Presidente' | 'Secretario' | 'Vocal') => {
      const m = this.model.miembros.find(x => roleMap[x.rol || ''] === target);
      return m?.docente ? Number(m.docente) : undefined;
    };
    const body: any = {
      id_user_student: Number(this.model.estudianteId),
      id_president: getIdByMapped('Presidente'),
      id_secretary: getIdByMapped('Secretario'),
      id_vocal: getIdByMapped('Vocal'),
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
