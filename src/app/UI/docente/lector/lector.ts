import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-lector-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lector.html',
  styleUrl: './lector.scss'
})
export class LectorDocente {
  estudiantes: Array<{ id: string; nombre: string; carrera: string; documentoUrl?: string | null; calificacion: number | null; observacion: string }>
    = [
      { id: 's1', nombre: 'Ana Torres', carrera: 'Ingeniería en Sistemas', documentoUrl: 'https://example.com/documents/ana-torres.pdf', calificacion: null, observacion: '' },
      { id: 's2', nombre: 'Luis García', carrera: 'Ingeniería Civil', documentoUrl: null, calificacion: null, observacion: '' },
      { id: 's3', nombre: 'Sofía Ramírez', carrera: 'Administración', documentoUrl: 'https://example.com/documents/sofia-ramirez.pdf', calificacion: null, observacion: '' },
    ];

  private storageKey = 'lector_calificaciones';

  constructor() {
    this.cargar();
  }

  guardar() {
    // Normalizar calificación a 0-10 con 1 decimal
    this.estudiantes = this.estudiantes.map(e => {
      let cal = e.calificacion;
      if (cal === null || cal === undefined || isNaN(Number(cal))) cal = null;
      else {
        cal = Math.max(0, Math.min(10, Number(cal)));
        cal = Math.round(cal * 10) / 10;
      }
      return { ...e, calificacion: cal };
    });
    localStorage.setItem(this.storageKey, JSON.stringify(this.estudiantes));
    alert('Calificaciones y observaciones guardadas (mock).');
  }

  verDocumento(e: { documentoUrl?: string | null; nombre: string }) {
    if (e.documentoUrl) {
      window.open(e.documentoUrl, '_blank');
    } else {
      alert(`El estudiante ${e.nombre} aún no tiene documento disponible.`);
    }
  }

  private cargar() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.estudiantes = parsed;
      }
    } catch { /* noop */ }
  }
}
