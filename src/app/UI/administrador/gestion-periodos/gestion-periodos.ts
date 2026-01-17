import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../../services/period.service';

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
    this.isModalOpen = true;
  }

  abrirEditar(p: any) {
    this.isEditing = true;
    this.form = { id: p.id, nombre: p.nombre, fechaInicio: p.fechaInicio, fechaFin: p.fechaFin };
    this.formError = '';
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
    if (!confirm(`¿Activar el período "${p.nombre}"?\nSe cerrará cualquier período activo anterior.`)) return;
    // Persistir en backend y refrescar lista
    this.periodSvc.setActivePeriodBackend(Number(p.id), p.nombre).subscribe({
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
        this.periodSvc.fetchAndSetFromBackend().subscribe();
      },
      error: (err) => {
        alert('No se pudo activar en el servidor: ' + (err?.error?.message || err?.message || 'Error'));
      }
    });
  }

  cerrar(p: any) {
    if (!confirm(`¿Cerrar el período "${p.nombre}"?`)) return;
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
      },
      error: (err) => {
        alert('No se pudo cerrar en el servidor: ' + (err?.error?.message || err?.message || 'Error'));
      }
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
    } catch {}
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  private uuid() {
    return 'p-' + Math.random().toString(36).slice(2, 10);
  }
}
