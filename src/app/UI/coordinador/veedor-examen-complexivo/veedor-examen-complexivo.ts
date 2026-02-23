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
  veedoresLoadError: string | null = null;

  // Veedores ya asignados en el período (cualquier carrera) para excluirlos al crear nuevas filas
  private veedoresAsignadosPeriodo = new Set<number>();

  private editBackup = new Map<number, { carreraId?: number; veedor1Id?: number; veedor2Id?: number }>();

  activePeriodId: number | null = null;

  model = {
    periodoId: undefined as number | undefined,
    carreraFiltro: undefined as string | undefined,
    materias: [] as Array<{
      carreraId?: number;
      veedor1Id?: number;
      veedor2Id?: number;
      locked: boolean;
    }>
  };

  errors: string[] = [];
  loading = false;
  message: string | null = null;
  error: string | null = null;

  // Paginación (client-side)
  page = 1;
  pageSize = 6;

  get totalPages(): number {
    const total = (this.model.materias || []).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get pagedMaterias() {
    const start = (this.page - 1) * this.pageSize;
    return (this.model.materias || []).slice(start, start + this.pageSize);
  }

  setPage(p: number) {
    const n = Math.max(1, Math.min(this.totalPages, Math.trunc(Number(p))));
    this.page = n;
  }

  addCarrera() {
    this.model.materias.push({ locked: false });
    this.setPage(this.totalPages);
    this.onChange();
  }

  removeCarrera(i: number) {
    const m = this.model.materias[i];
    if (!m) return;

    // Si la fila está bloqueada, significa que viene de BD. Al quitar, debe borrarse en BD.
    const isLocked = !!m.locked;
    const careerId = Number(m.carreraId);
    const academicPeriodId = Number(this.model.periodoId);

    // Remover del UI inmediatamente
    this.model.materias.splice(i, 1);
    // Reajustar página si quedó fuera de rango
    if (this.page > this.totalPages) this.setPage(this.totalPages);
    this.onChange();

    if (isLocked && Number.isFinite(careerId) && Number.isFinite(academicPeriodId)) {
      this.loading = true;
      this.http.put('/api/complexivo/veedores/set', { careerId, teacherIds: [], academicPeriodId }).subscribe({
        next: () => {
          this.message = 'Asignación eliminada correctamente.';
          this.cargarAsignaciones();
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudo eliminar la asignación.';
          this.cargarAsignaciones();
        },
        complete: () => { this.loading = false; }
      });
    }
  }

  hasEditableRows(): boolean {
    return (this.model.materias || []).some((m) => !m?.locked);
  }

  startEditRow(i: number) {
    const m = this.model.materias[i];
    if (!m || !m.locked) return;
    this.editBackup.set(i, { carreraId: m.carreraId, veedor1Id: m.veedor1Id, veedor2Id: m.veedor2Id });
    m.locked = false;
    this.onChange();
  }

  cancelEditRow(i: number) {
    const m = this.model.materias[i];
    if (!m) return;
    const b = this.editBackup.get(i);
    if (b) {
      m.carreraId = b.carreraId;
      m.veedor1Id = b.veedor1Id;
      m.veedor2Id = b.veedor2Id;
    }
    m.locked = true;
    this.editBackup.delete(i);
    this.onChange();
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

  onChangeVeedores(rowIndex: number) {
    const m = this.model.materias[rowIndex];
    if (!m) return;

    const v1 = Number(m.veedor1Id);
    const v2 = Number(m.veedor2Id);

    if (Number.isFinite(v1) && Number.isFinite(v2) && v1 === v2) {
      m.veedor2Id = undefined;
      this.errors = Array.from(new Set([...(this.errors || []), `Fila ${rowIndex + 1}: Los veedores no pueden ser el mismo.`]));
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

  private getSelectedIdsForRow(rowIndex: number): number[] {
    const m = this.model.materias[rowIndex];
    if (!m) return [];
    const ids = [Number(m.veedor1Id), Number(m.veedor2Id)].filter((v) => Number.isFinite(v));
    return ids.map(Number);
  }

  getAvailableVeedores(rowIndex: number, slot: 1 | 2) {
    const currentSelected = new Set<number>(this.getSelectedIdsForRow(rowIndex));

    const usedElsewhere = new Set<number>();
    this.model.materias.forEach((m, idx) => {
      if (idx === rowIndex) return;
      [Number(m?.veedor1Id), Number(m?.veedor2Id)].forEach((v) => {
        const id = Number(v);
        if (Number.isFinite(id)) usedElsewhere.add(id);
      });
    });

    const current = this.model.materias[rowIndex];
    const selectedThisSlot = slot === 1 ? Number(current?.veedor1Id) : Number(current?.veedor2Id);
    const selectedOtherSlot = slot === 1 ? Number(current?.veedor2Id) : Number(current?.veedor1Id);

    // Disponibles = todos - asignados en el período - usados en otras filas + (los que ya están seleccionados en esta fila)
    return (this.veedoresDisponibles || []).filter(v => {
      const id = Number(v.id_user);
      if (!Number.isFinite(id)) return false;

      // Mantener visible lo que ya está seleccionado en ESTE slot
      if (Number.isFinite(selectedThisSlot) && id === selectedThisSlot) return true;
      // Bloquear repetir el mismo docente en el OTRO slot
      if (Number.isFinite(selectedOtherSlot) && id === selectedOtherSlot) return false;

      if (usedElsewhere.has(id)) return false;
      // excluir si ya está asignado en otra carrera del período
      return !this.veedoresAsignadosPeriodo.has(id);
    });
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

  private validate(): boolean {
    const errs: string[] = [];
    if (!Number.isFinite(Number(this.model.periodoId))) errs.push('El período es requerido.');
    if (this.model.materias.length === 0) errs.push('Agregue al menos una carrera.');
    const nombres = new Set<string>();

    this.model.materias.forEach((m, idx) => {
      if (!m.carreraId) errs.push(`Fila ${idx + 1}: La carrera evaluada es requerida.`);
      if (Number.isFinite(Number(m.carreraId))) {
        const key = String(m.carreraId);
        if (nombres.has(key)) errs.push('La carrera seleccionada está duplicada.');
        nombres.add(key);
      }

      const v1 = Number(m.veedor1Id);
      const v2 = Number(m.veedor2Id);
      const hasV1 = Number.isFinite(v1);
      const hasV2 = Number.isFinite(v2);
      if (!hasV1 && !hasV2) errs.push(`Fila ${idx + 1}: Seleccione al menos un veedor.`);
      if (hasV1 && hasV2 && v1 === v2) errs.push(`Fila ${idx + 1}: Los veedores no pueden ser el mismo.`);
    });
    this.errors = errs; return errs.length === 0;
  }

  private cargarAsignaciones() {
    if (!Number.isFinite(Number(this.model.periodoId))) {
      this.model.materias = [];
      this.veedoresAsignadosPeriodo = new Set<number>();
      return;
    }
    const params: any = { academicPeriodId: Number(this.model.periodoId) };
    this.http.get<any[]>('/api/complexivo/veedores', { params }).subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const grouped = new Map<number, number[]>();
        const assigned = new Set<number>();
        for (const r of list) {
          const cid = Number((r as any)?.id_career);
          const uid = Number((r as any)?.users?.id_user);
          if (!Number.isFinite(cid) || !Number.isFinite(uid)) continue;
          assigned.add(uid);
          if (!grouped.has(cid)) grouped.set(cid, []);
          const arr = grouped.get(cid)!;
          if (!arr.includes(uid)) arr.push(uid);
        }
        this.veedoresAsignadosPeriodo = assigned;
        const materias = Array.from(grouped.entries()).map(([carreraId, veedores]) => ({
          carreraId,
          veedor1Id: veedores?.[0],
          veedor2Id: veedores?.[1],
          locked: true,
        }));
        this.model.materias = materias;
        this.setPage(1);
        this.onChange();
      },
      error: (_err) => {
        this.model.materias = [];
        this.veedoresAsignadosPeriodo = new Set<number>();
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
      this.carrerasDisponibles = this.onlyTecnologiaAndUniqueCarreras(Array.isArray(data) ? data : []);
    });

    this.loadVeedores();
  }

  private loadVeedores() {
    this.veedoresLoadError = null;

    const normalize = (list: any) => {
      const arr = Array.isArray(list) ? list : [];
      return arr
        .map((x: any) => ({ id_user: Number(x?.id_user), fullname: this.toTitleCase(String(x?.fullname || '').trim()) }))
        .filter((x: any) => Number.isFinite(Number(x.id_user)) && x.fullname)
        .filter((x: any) => !/^usuario\b/i.test(String(x.fullname || '').trim()));
    };

    const setOrEmptyError = (list: Array<{ id_user: number; fullname: string }>) => {
      this.veedoresDisponibles = list;
      if (!this.veedoresDisponibles.length) this.veedoresLoadError = 'No hay docentes disponibles para asignar como veedores.';
    };

    this.http.get<Array<{ id_user: number; fullname: string }>>('/api/docente/admin/docentes').subscribe({
      next: (list) => setOrEmptyError(normalize(list)),
      error: (err) => {
        const status = Number(err?.status);
        if (status === 401 || status === 403) {
          this.http.get<Array<{ id_user: number; fullname: string }>>('/api/uic/admin/docentes').subscribe({
            next: (list2) => setOrEmptyError(normalize(list2)),
            error: (err2) => {
              this.veedoresDisponibles = [];
              const status2 = Number(err2?.status);
              if (status2 === 401 || status2 === 403) {
                this.veedoresLoadError = 'No autorizado para listar docentes (verifique su rol y sesión).';
              } else {
                this.veedoresLoadError = 'No se pudo cargar la lista de docentes.';
              }
            }
          });
          return;
        }

        this.veedoresDisponibles = [];
        this.veedoresLoadError = 'No se pudo cargar la lista de docentes.';
      }
    });
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
        const teacherIds = [Number(m.veedor1Id), Number(m.veedor2Id)]
          .filter((v) => Number.isFinite(v));
        if (!teacherIds.length) return null;
        return this.http.put('/api/complexivo/veedores/set', { careerId, teacherIds, academicPeriodId });
      })
      .filter((x): x is Observable<unknown> => x != null);

    const run$ = requests.length ? forkJoin(requests) : of([]);
    run$.subscribe({
      next: () => {
        this.message = 'Asignación de veedores guardada correctamente.';
        // Bloquear edición después de guardar. Se habilita nuevamente al agregar una nueva carrera.
        this.model.materias = (this.model.materias || []).map((m) => ({ ...m, locked: true }));
        this.cargarAsignaciones();
      },
      error: (err) => {
        this.error = err?.error?.message || 'No se pudo guardar la asignación de veedores.';
      },
      complete: () => { this.loading = false; }
    });
  }
}