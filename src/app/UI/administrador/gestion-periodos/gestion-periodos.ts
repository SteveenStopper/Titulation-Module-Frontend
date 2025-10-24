import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  constructor() {
    this.cargar();
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

    if (this.isEditing) {
      this.periodos = this.periodos.map(p => p.id === this.form.id ? {
        ...p,
        nombre: this.form.nombre.trim(),
        fechaInicio: this.form.fechaInicio,
        fechaFin: this.form.fechaFin,
      } : p);
    } else {
      this.periodos.push({
        id: this.form.id,
        nombre: this.form.nombre.trim(),
        fechaInicio: this.form.fechaInicio,
        fechaFin: this.form.fechaFin,
        estado: 'borrador'
      });
    }
    this.guardar();
    this.isModalOpen = false;
  }

  activar(p: any) {
    if (!confirm(`¿Activar el período "${p.nombre}"?\nSe cerrará cualquier período activo anterior.`)) return;
    // Solo uno activo a la vez: cerrar activo previo si existe
    const anterior = this.periodos.find(x => x.estado === 'activo');
    if (anterior && anterior.id !== p.id) {
      anterior.estado = 'cerrado';
    }
    this.periodos = this.periodos.map(x => x.id === p.id ? { ...x, estado: 'activo' } : x);
    this.guardar();
  }

  cerrar(p: any) {
    if (!confirm(`¿Cerrar el período "${p.nombre}"?`)) return;
    this.periodos = this.periodos.map(x => x.id === p.id ? { ...x, estado: 'cerrado' } : x);
    this.guardar();
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
