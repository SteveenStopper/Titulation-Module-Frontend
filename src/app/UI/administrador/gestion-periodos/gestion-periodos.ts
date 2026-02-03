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

  periodos: Array<{
    id: string;
    nombre: string;
    fechaInicio: string; // ISO yyyy-mm-dd
    fechaFin: string;    // ISO yyyy-mm-dd
    estado: 'borrador' | 'activo' | 'cerrado';
  }> = [];

  // Modal state
  isModalOpen = false;
  isEditing = false;
  institutePeriods: Array<{ id: number; name: string; status?: string }> = [];
  form = {
    id: '',
    nombre: '',
    fechaInicio: '',
    fechaFin: ''
  };
  formError = '';
  filtro = '';

  constructor(private periodSvc: PeriodService) {
    this.cargar();
    // Cargar lista desde backend y reflejar en UI
    this.periodSvc.listAll().subscribe((rows) => {
      if (Array.isArray(rows)) {
        this.periodos = rows.map(r => ({
          id: String(r.id_academic_periods),
          nombre: r.name,
          fechaInicio: r.date_start || '',
          fechaFin: r.date_end || '',
          estado: (r.status === 'activo' ? 'activo' : (r.status === 'cerrado' || r.status === 'inactivo') ? 'cerrado' : 'borrador')
        }));
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

  abrirEditar(p: any) {
    this.isEditing = true;
    this.form = { id: p.id, nombre: p.nombre, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin };
    this.formError = '';
    this.institutePeriods = [];
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

  guardarFormulario() {
    this.formError = '';
    if (!this.form.nombre.trim()) {
      this.formError = 'El nombre es obligatorio';
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

    // Validar duplicado por nombre en FE (case-insensitive)
    const nombreLower = this.form.nombre.trim().toLowerCase();
    const dup = this.periodos.some(p => p.nombre.trim().toLowerCase() === nombreLower);
    if (!this.isEditing && dup) {
      this.formError = 'Ya existe un período con ese nombre';
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
          this.periodSvc.listAll().subscribe((rows) => {
            if (Array.isArray(rows)) {
              this.periodos = rows.map(r => ({
                id: String(r.id_academic_periods),
                nombre: r.name,
                fechaInicio: r.date_start || '',
                fechaFin: r.date_end || '',
                estado: (r.status === 'activo' ? 'activo' : (r.status === 'cerrado' || r.status === 'inactivo') ? 'cerrado' : 'borrador')
              }));
              this.guardar();
            }
          });
          this.isModalOpen = false;
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
          this.periodos.push({
            id: String(created.id_academic_periods),
            nombre: created.name,
            fechaInicio: fechaInicioISO,
            fechaFin: fechaFinISO,
            estado: 'borrador'
          });
          this.guardar();
          this.isModalOpen = false;
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

      // Elegir período externo (instituto) y guardar mapping external_period_for_<id_local>
      this.periodSvc.listInstitutePeriods().subscribe({
        next: (rows) => {
          const periods = Array.isArray(rows) ? rows : [];
          const inputOptions: Record<string, string> = {};
          periods.forEach((it) => {
            inputOptions[String(it.id)] = `${it.id} - ${it.name}`;
          });

          Swal.fire({
            title: 'Selecciona período del instituto',
            text: 'Este ID se usará para mapear estudiantes/notas/aranceles del período activo.',
            input: 'select',
            inputOptions,
            inputPlaceholder: 'Seleccione un período',
            showCancelButton: true,
            confirmButtonText: 'Activar',
            cancelButtonText: 'Cancelar',
            customClass: {
              confirmButton: 'swal-btn-confirm',
              cancelButton: 'swal-btn-cancel'
            },
            inputValidator: (value) => {
              if (!value) return 'Debe seleccionar un período del instituto';
              return null;
            }
          }).then((pick) => {
            if (!pick.isConfirmed) return;
            const externalId = Number(pick.value);
            if (!Number.isFinite(externalId)) {
              Swal.fire({
                title: 'Selección inválida',
                text: 'El período seleccionado no es válido.',
                icon: 'error',
                confirmButtonText: 'Cerrar',
                customClass: { confirmButton: 'swal-btn-cancel' }
              });
              return;
            }

            // Persistir en backend y refrescar lista
            this.periodSvc.setActivePeriodBackend(Number(p.id), p.nombre, externalId).subscribe({
              next: () => {
                this.periodSvc.listAll().subscribe((rows2) => {
                  if (Array.isArray(rows2)) {
                    this.periodos = rows2.map(r => ({
                      id: String(r.id_academic_periods),
                      nombre: r.name,
                      fechaInicio: r.date_start || '',
                      fechaFin: r.date_end || '',
                      estado: (r.status === 'activo' ? 'activo' : (r.status === 'cerrado' || r.status === 'inactivo') ? 'cerrado' : 'borrador')
                    }));
                    this.guardar();
                  }
                });
                this.periodSvc.fetchAndSetFromBackend().subscribe();
                Swal.fire({
                  title: 'Activado',
                  text: `Período activado y mapeado al período del instituto ${externalId}.`,
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
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'No se pudo cargar los períodos del instituto';
          Swal.fire({
            title: 'No se pudo activar',
            text: String(msg),
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
          this.periodSvc.listAll().subscribe((rows) => {
            if (Array.isArray(rows)) {
              this.periodos = rows.map(r => ({
                id: String(r.id_academic_periods),
                nombre: r.name,
                fechaInicio: r.date_start || '',
                fechaFin: r.date_end || '',
                estado: (r.status === 'activo' ? 'activo' : (r.status === 'cerrado' || r.status === 'inactivo') ? 'cerrado' : 'borrador')
              }));
              this.guardar();
            }
          });
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