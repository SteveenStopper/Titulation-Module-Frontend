import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../../services/period.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-gestion-periodos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-periodos.html',
  styleUrls: ['./gestion-periodos.scss']
})
export class GestionPeriodos {
  private storageKey = 'admin_periodos';

  minStartDate = '';

  periodos: Array<{
    id: string;
    nombre: string;
    fechaInicio: string; // ISO yyyy-mm-dd
    fechaFin: string;    // ISO yyyy-mm-dd
    estado: 'borrador' | 'activo' | 'cerrado';
    used?: boolean;
    external_period_id?: number | null;
  }> = [];

  // Modal state
  isModalOpen = false;
  isEditing = false;
  institutePeriods: Array<{ id: number; name: string; status?: string; date_start?: string | null; date_end?: string | null }> = [];
  selectedInstitutePeriodId: number | null = null;
  form = {
    id: '',
    nombre: '',
    fechaInicio: '',
    fechaFin: ''
  };
  formError = '';
  filtro = '';

  constructor(private periodSvc: PeriodService) {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    this.minStartDate = t.toISOString().slice(0, 10);

    this.cargar();
    // Cargar lista desde backend y reflejar en UI
    this.periodSvc.listAll().subscribe((rows) => {
      if (Array.isArray(rows)) {
        this.periodos = rows.map(r => {
          const fechaFin = r.date_end || '';
          const baseEstado = (r.status === 'activo' ? 'activo' : (r.status === 'cerrado') ? 'cerrado' : 'borrador');
          const estado = (baseEstado !== 'activo' && this.isPastPeriod({ fechaFin })) ? 'cerrado' : baseEstado;
          return {
            id: String(r.id_academic_periods),
            nombre: r.name,
            fechaInicio: r.date_start || '',
            fechaFin,
            estado,
            used: (r as any).used === true,
            external_period_id: (r as any).external_period_id ?? null,
          };
        });
      }
    });
  }

  private refreshList() {
    this.periodSvc.listAll().subscribe((rows) => {
      if (Array.isArray(rows)) {
        this.periodos = rows.map(r => {
          const fechaFin = r.date_end || '';
          const baseEstado = (r.status === 'activo' ? 'activo' : (r.status === 'cerrado') ? 'cerrado' : 'borrador');
          const estado = (baseEstado !== 'activo' && this.isPastPeriod({ fechaFin })) ? 'cerrado' : baseEstado;
          return {
            id: String(r.id_academic_periods),
            nombre: r.name,
            fechaInicio: r.date_start || '',
            fechaFin,
            estado,
            used: (r as any).used === true,
            external_period_id: (r as any).external_period_id ?? null,
          };
        });
        this.guardar();
      }
    });
  }

  get activoActual() {
    return this.periodos.find(p => p.estado === 'activo') || null;
  }

  get periodosFiltrados() {
    const q = this.filtro.trim().toLowerCase();
    if (!q) return this.periodos;
    return this.periodos.filter(p => p.nombre.toLowerCase().includes(q));
  }

  abrirCrear() {
    this.isEditing = false;
    this.form = { id: this.uuid(), nombre: '', fechaInicio: '', fechaFin: '' };
    this.formError = '';
    this.institutePeriods = [];
    this.selectedInstitutePeriodId = null;
    this.periodSvc.listInstitutePeriods().subscribe({
      next: (rows) => {
        this.institutePeriods = Array.isArray(rows) ? rows : [];
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'No se pudo cargar los períodos del instituto';
        this.formError = String(msg);
        this.institutePeriods = [];
      }
    });
    this.isModalOpen = true;
  }

  onInstitutePeriodChange(id: any) {
    const num = id == null ? null : Number(id);
    this.selectedInstitutePeriodId = Number.isFinite(Number(num)) ? Number(num) : null;
    const found = this.institutePeriods.find(x => Number(x.id) === Number(this.selectedInstitutePeriodId));
    if (!found) return;
    this.form.nombre = found.name;
  }

  onFechaInicioChange() {
    if (!this.form.fechaInicio) return;
    if (this.form.fechaFin && this.form.fechaFin < this.form.fechaInicio) {
      this.form.fechaFin = '';
    }
  }

  private isPastPeriod(p: { fechaFin: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(String(p?.fechaFin || ''));
    if (!Number.isFinite(end.getTime())) return false;
    return end < today;
  }

  canEdit(p: any) {
    if (!p) return false;
    if (p.estado === 'cerrado') return false;
    if (this.isPastPeriod(p)) return false;
    return true;
  }

  canActivate(p: any) {
    if (!p) return false;
    if (p.estado !== 'borrador') return false;
    if (this.isPastPeriod(p)) return false;
    return Number.isFinite(Number(p.external_period_id));
  }

  canDelete(p: any) {
    if (!p) return false;
    if (p.used) return false;
    if (p.estado === 'activo') return false;
    return p.estado === 'borrador' || p.estado === 'cerrado';
  }

  abrirEditar(p: any) {
    if (!this.canEdit(p)) return;
    this.isEditing = true;
    this.form = { id: p.id, nombre: p.nombre, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin };
    this.formError = '';
    this.institutePeriods = [];
    this.selectedInstitutePeriodId = (p.external_period_id != null ? Number(p.external_period_id) : null);
    this.periodSvc.listInstitutePeriods().subscribe({
      next: (rows) => {
        this.institutePeriods = Array.isArray(rows) ? rows : [];
        if (this.selectedInstitutePeriodId) {
          this.onInstitutePeriodChange(this.selectedInstitutePeriodId);
        }
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'No se pudo cargar los períodos del instituto';
        this.formError = String(msg);
        this.institutePeriods = [];
      }
    });
    this.isModalOpen = true;
  }

  guardarFormulario() {
    this.formError = '';
    if (!this.form.nombre.trim()) {
      this.formError = 'El nombre es obligatorio';
      return;
    }
    if (!this.selectedInstitutePeriodId) {
      this.formError = 'Debe seleccionar un período del instituto';
      return;
    }
    if (!this.form.fechaInicio || !this.form.fechaFin) {
      this.formError = 'Las fechas son obligatorias';
      return;
    }
    if (this.form.fechaInicio > this.form.fechaFin) {
      this.formError = 'La fecha de inicio no puede ser mayor que la fecha de fin';
      return;
    }

    // normalizar fechas a yyyy-MM-dd
    const toISO = (s: string) => {
      const str = (s || '').trim();
      const ddmmyyyy = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/;
      if (ddmmyyyy.test(str)) {
        const [, dd, mm, yyyy] = str.match(ddmmyyyy) as any;
        return `${yyyy}-${mm}-${dd}`;
      }
      return str; // ya viene yyyy-MM-dd
    };
    const fechaInicioISO = toISO(this.form.fechaInicio);
    const fechaFinISO = toISO(this.form.fechaFin);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ds = new Date(fechaInicioISO);
    const de = new Date(fechaFinISO);
    if (!Number.isFinite(ds.getTime()) || !Number.isFinite(de.getTime())) {
      this.formError = 'Fechas inválidas';
      return;
    }
    if (!this.isEditing) {
      if (ds < today || de < today) {
        this.formError = 'No se puede crear un período con fechas pasadas';
        return;
      }
    } else {
      if (de < today) {
        this.formError = 'No se puede establecer una fecha fin pasada';
        return;
      }
    }

    // Validar duplicado por nombre en FE (case-insensitive)
    const nombreLower = this.form.nombre.trim().toLowerCase();
    const dup = this.periodos.some(p => p.nombre.trim().toLowerCase() === nombreLower && String(p.id) !== String(this.form.id));
    if (dup) {
      this.formError = 'Ya existe un período con ese nombre';
      return;
    }

    const dupFechas = this.periodos.some(p => (p.fechaInicio || '') === fechaInicioISO && (p.fechaFin || '') === fechaFinISO);
    if (!this.isEditing && dupFechas) {
      this.formError = 'Ya existe un período con las mismas fechas';
      return;
    }

    if (this.isEditing) {
      // Persistir cambios en backend
      this.periodSvc.updatePeriod(Number(this.form.id), {
        name: this.form.nombre.trim(),
        date_start: fechaInicioISO,
        date_end: fechaFinISO,
      }).subscribe({
        next: () => {
          // guardar mapeo externo
          this.periodSvc.setExternalPeriodMap(Number(this.form.id), Number(this.selectedInstitutePeriodId)).subscribe({
            next: () => {
              this.refreshList();
              this.isModalOpen = false;
            },
            error: (err2) => {
              this.formError = String(err2?.error?.message || err2?.message || 'No se pudo guardar el mapeo con el instituto');
            }
          });
        },
        error: (err) => {
          this.formError = String(err?.error?.message || err?.message || 'No se pudo actualizar el período en el servidor');
        }
      });
      return;
    } else {
      // Crear en backend
      this.periodSvc.createPeriod({
        name: this.form.nombre.trim(),
        date_start: fechaInicioISO,
        date_end: fechaFinISO
      }).subscribe({
        next: (created) => {
          const newId = Number(created.id_academic_periods);
          this.periodSvc.setExternalPeriodMap(newId, Number(this.selectedInstitutePeriodId)).subscribe({
            next: () => {
              this.refreshList();
              this.isModalOpen = false;
            },
            error: (err2) => {
              this.formError = String(err2?.error?.message || err2?.message || 'Se creó el período pero no se pudo guardar el mapeo con el instituto');
            }
          });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'No se pudo guardar el período en el servidor';
          this.formError = String(msg);
        }
      });
      return;
    }
    this.guardar();
    this.isModalOpen = false;
  }

  activar(p: any) {
    Swal.fire({
      title: '¿Activar período?',
      text: `¿Activar el período "${p.nombre}"? Se cerrará cualquier período activo anterior.`,
      icon: 'warning',
      showCancelButton: true,
      customClass: {
        confirmButton: 'swal-btn-confirm',
        cancelButton: 'swal-btn-cancel'
      },
      confirmButtonText: 'Sí, activar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (!result.isConfirmed) return;

      const externalId = Number(p.external_period_id);
      if (!Number.isFinite(externalId)) {
        Swal.fire({
          title: 'No se puede activar',
          text: 'Debe mapear primero este período con un período del instituto (selección en Nuevo/Editar período).',
          icon: 'error',
          confirmButtonText: 'Cerrar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
        return;
      }

      this.periodSvc.setActivePeriodBackend(Number(p.id), p.nombre, externalId).subscribe({
        next: () => {
          this.refreshList();
          this.periodSvc.fetchAndSetFromBackend().subscribe();
          Swal.fire({
            title: 'Activado',
            text: `Período activado correctamente.`,
            icon: 'success',
            confirmButtonText: 'Aceptar',
            customClass: { confirmButton: 'swal-btn-confirm' }
          });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Error';
          Swal.fire({
            title: 'No se pudo activar',
            text: 'No se pudo activar en el servidor: ' + msg,
            icon: 'error',
            confirmButtonText: 'Cerrar',
            customClass: { confirmButton: 'swal-btn-cancel' }
          });
        }
      });
    });
  }

  eliminar(p: any) {
    Swal.fire({
      title: '¿Eliminar período?',
      text: `¿Eliminar el período "${p.nombre}"? Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-btn-confirm', cancelButton: 'swal-btn-cancel' }
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.periodSvc.deletePeriod(Number(p.id)).subscribe({
        next: () => {
          this.refreshList();
          Swal.fire({
            title: 'Eliminado',
            text: 'Período eliminado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            customClass: { confirmButton: 'swal-btn-confirm' }
          });
        },
        error: (err) => {
          Swal.fire({
            title: 'No se pudo eliminar',
            text: String(err?.error?.message || err?.message || 'Error'),
            icon: 'error',
            confirmButtonText: 'Cerrar',
            customClass: { confirmButton: 'swal-btn-cancel' }
          });
        }
      });
    });
  }

  cerrar(p: any) {
    Swal.fire({
      title: '¿Cerrar período?',
      text: `¿Cerrar el período "${p.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'swal-btn-confirm',
        cancelButton: 'swal-btn-cancel'
      }
    }).then((result) => {
      if (!result.isConfirmed) return;

      this.periodSvc.closePeriod(Number(p.id)).subscribe({
        next: () => {
          this.refreshList();
          // limpiar período activo en FE porque pudo ser el activo
          this.periodSvc.fetchAndSetFromBackend().subscribe();

          Swal.fire({
            title: 'Cerrado',
            text: 'El período fue cerrado correctamente.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            customClass: {
              confirmButton: 'swal-btn-confirm'
            }
          });
        },
        error: (err) => {
          Swal.fire({
            title: 'No se pudo cerrar',
            text: 'No se pudo cerrar en el servidor: ' + (err?.error?.message || err?.message || 'Error'),
            icon: 'error',
            confirmButtonText: 'Cerrar',
            customClass: {
              confirmButton: 'swal-btn-cancel'
            }
          });
        }
      });
    });
  }

  private guardar() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.periodos));
  }

  private cargar() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.periodos = parsed;
      }
    } catch { }
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  private uuid() {
    return 'p-' + Math.random().toString(36).slice(2, 10);
  }
}