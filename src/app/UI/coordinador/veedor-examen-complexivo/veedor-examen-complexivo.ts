import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../../services/period.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of, Observable } from 'rxjs';

@Component({
  selector: 'app-veedor-examen-complexivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veedor-examen-complexivo.html',
  styleUrl: './veedor-examen-complexivo.scss'
})
export class VeedorExamenComplexivo {
  periodOptions: Array<{ id_academic_periods: number; name: string }> = [];
  carrerasDisponibles: Array<{ id: number; nombre: string }> = [];
  veedoresDisponibles: Array<{ id_user: number; fullname: string }> = [];

  activePeriodId: number | null = null;

  model = {
    periodoId: undefined as number | undefined,
    carreraFiltro: undefined as string | undefined,
    materias: [] as Array<{
      carreraId?: number;
      veedores: number[];
    }>
  };

  errors: string[] = [];
  loading = false;
  message: string | null = null;
  error: string | null = null;

  addCarrera() {
    if (this.model.materias.length >= 4) return;
    this.model.materias.push({ veedores: [] });
    this.onChange();
  }

  removeCarrera(i: number) {
    this.model.materias.splice(i, 1);
    this.onChange();
  }

  toggleVeedor(i: number, id_user: number, checked: boolean) {
    const m = this.model.materias[i];
    if (!m) return;
    if (checked) {
      if (!m.veedores.includes(id_user)) m.veedores.push(id_user);
    } else {
      m.veedores = m.veedores.filter(v => v !== id_user);
    }
    this.onChange();
  }

  onChange() { this.validate(); }

  onChangePeriodo() {
    this.message = null;
    this.error = null;
    // En esta vista solo se permite el período activo
    if (Number.isFinite(Number(this.activePeriodId)) && Number(this.model.periodoId) !== Number(this.activePeriodId)) {
      this.model.periodoId = Number(this.activePeriodId);
    }
    this.cargarAsignaciones();
    this.onChange();
  }

  getAvailableVeedores(rowIndex: number) {
    const current = this.model.materias[rowIndex];
    const currentSelected = new Set<number>((current?.veedores || []).map(Number));

    const usedElsewhere = new Set<number>();
    this.model.materias.forEach((m, idx) => {
      if (idx === rowIndex) return;
      (m?.veedores || []).forEach((v) => {
        const id = Number(v);
        if (Number.isFinite(id)) usedElsewhere.add(id);
      });
    });

    // Disponibles = todos - usados en otras filas + (los que ya están seleccionados en esta fila)
    return (this.veedoresDisponibles || []).filter(v => {
      const id = Number(v.id_user);
      if (!Number.isFinite(id)) return false;
      if (currentSelected.has(id)) return true;
      return !usedElsewhere.has(id);
    });
  }

  private validate(): boolean {
    const errs: string[] = [];
    if (!Number.isFinite(Number(this.model.periodoId))) errs.push('El período es requerido.');
    if (this.model.materias.length === 0) errs.push('Agregue al menos una carrera.');
    if (this.model.materias.length > 4) errs.push('No puede asignar más de 4 carreras para el examen complexivo.');
    const nombres = new Set<string>();
    this.model.materias.forEach((m, idx) => {
      if (!m.carreraId) errs.push(`Fila ${idx + 1}: La carrera evaluada es requerida.`);
      if (Number.isFinite(Number(m.carreraId))) {
        const key = String(m.carreraId);
        if (nombres.has(key)) errs.push('La carrera seleccionada está duplicada.');
        nombres.add(key);
      }
      if (!m.veedores || m.veedores.length === 0) errs.push(`Fila ${idx + 1}: Seleccione al menos un veedor.`);
    });
    this.errors = errs; return errs.length === 0;
  }

  private cargarAsignaciones() {
    if (!Number.isFinite(Number(this.model.periodoId))) {
      this.model.materias = [];
      return;
    }
    const params: any = { academicPeriodId: Number(this.model.periodoId) };
    this.http.get<any[]>('/api/complexivo/veedores', { params }).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const grouped = new Map<number, number[]>();
        for (const r of list) {
          const cid = Number((r as any)?.id_career);
          const uid = Number((r as any)?.users?.id_user);
          if (!Number.isFinite(cid) || !Number.isFinite(uid)) continue;
          if (!grouped.has(cid)) grouped.set(cid, []);
          const arr = grouped.get(cid)!;
          if (!arr.includes(uid)) arr.push(uid);
        }
        const materias = Array.from(grouped.entries()).slice(0, 4).map(([carreraId, veedores]) => ({ carreraId, veedores }));
        this.model.materias = materias;
        this.onChange();
      },
      error: (_err) => {
        this.model.materias = [];
      }
    });
  }

  constructor(private periodSvc: PeriodService, private http: HttpClient) {
    this.periodSvc.listAll().subscribe(list => {
      this.periodOptions = Array.isArray(list)
        ? (list || []).map(p => ({ id_academic_periods: Number(p.id_academic_periods), name: String(p.name || '') }))
          .filter(p => Number.isFinite(Number(p.id_academic_periods)))
        : [];
    });

    // Período activo (bloquea guardado en períodos pasados)
    this.http.get<any>('/api/settings/active-period').subscribe(val => {
      const ap = val && Number.isFinite(Number(val.id_academic_periods)) ? Number(val.id_academic_periods) : null;
      this.activePeriodId = ap;
      if (Number.isFinite(Number(ap))) {
        this.model.periodoId = Number(ap);
        this.cargarAsignaciones();
      }
    });

    // Cargar carreras desde BE
    this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras').subscribe(data => {
      this.carrerasDisponibles = Array.isArray(data) ? data : [];
    });
    // Cargar docentes (veedores) globalmente sin filtrar por carrera
    this.http
      .get<Array<{ id_user: number; fullname: string }>>('/api/uic/admin/docentes')
      .subscribe(list => { this.veedoresDisponibles = Array.isArray(list) ? list : []; });
  }

  guardar() {
    this.message = null;
    this.error = null;
    if (!this.validate()) return;
    const academicPeriodId = Number(this.model.periodoId);
    if (Number.isFinite(Number(this.activePeriodId)) && academicPeriodId !== Number(this.activePeriodId)) {
      this.error = 'Solo se permite guardar en el período activo.';
      return;
    }
    this.loading = true;

    // Guardar por carrera (reemplaza las asignaciones de esa carrera en el período activo)
    const requests = this.model.materias
      .map((m): Observable<unknown> | null => {
        const careerId = Number(m.carreraId);
        if (!Number.isFinite(careerId)) return null;
        const teacherIds = (Array.isArray(m.veedores) ? m.veedores : [])
          .map(Number)
          .filter((v) => Number.isFinite(v));
        return this.http.put('/api/complexivo/veedores/set', { careerId, teacherIds, academicPeriodId });
      })
      .filter((x): x is Observable<unknown> => x != null);

    const run$ = requests.length ? forkJoin(requests) : of([]);
    run$.subscribe({
      next: () => {
        this.message = 'Asignación de veedores guardada correctamente.';
        this.cargarAsignaciones();
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo guardar la asignación de veedores.';
      },
      complete: () => { this.loading = false; }
    });
  }
}
