import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-lector-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lector.html',
  styleUrl: './lector.scss'
})
export class LectorDocente {
  estudiantes: Array<{ id: string; nombre: string; carrera: string | null; documentoUrl?: string | null; calificacion: number | null; observacion: string }>
    = [];

  constructor(private http: HttpClient) {
    this.cargarLista();
  }

  guardar() {
    // normalizar y enviar a backend por cada estudiante
    const peticiones = this.estudiantes.map(e => {
      let cal = e.calificacion;
      if (cal === null || cal === undefined || isNaN(Number(cal as any))) cal = null;
      else {
        cal = Math.max(0, Math.min(10, Number(cal)));
        cal = Math.round(cal * 10) / 10;
      }
      const body = { calificacion: cal, observacion: e.observacion ?? '' } as any;
      return this.http.put(`/api/docente/lector/estudiantes/${e.id}/review`, body);
    });

    forkJoin(peticiones).subscribe({
      next: () => alert('Calificaciones y observaciones guardadas.'),
      error: () => alert('Error al guardar. Intenta nuevamente.')
    });
  }

  verDocumento(e: { documentoUrl?: string | null; nombre: string }) {
    const raw = e.documentoUrl != null ? String(e.documentoUrl).trim() : '';
    if (raw) {
      let url = raw;
      // Si viene relativo (ej: "uploads/documents/..."), convertir a URL absoluta
      // usando el mismo host del backend (API_BASE) para soportar front/back en puertos distintos.
      if (!/^https?:\/\//i.test(url)) {
        const apiBase = (window as any).__API_BASE__ || `${window.location.origin}/api`;
        const backendBase = String(apiBase).replace(/\/+$/, '').replace(/\/api$/, '');
        if (!url.startsWith('/')) url = '/' + url;
        url = backendBase + url;
      }
      window.open(url, '_blank', 'noopener');
    } else {
      alert(`El estudiante ${e.nombre} aún no tiene documento disponible.`);
    }
  }

  private cargarLista() {
    this.http.get<Array<{ id: string; nombre: string; carrera: string | null; documentoUrl?: string | null; calificacion?: number | null; observacion?: string }>>('/api/docente/lector/estudiantes')
      .subscribe(list => {
        this.estudiantes = (Array.isArray(list) ? list : []).map(e => ({
          id: e.id,
          nombre: e.nombre,
          carrera: e.carrera ?? null,
          documentoUrl: e.documentoUrl == null ? null : String(e.documentoUrl),
          calificacion: e.calificacion == null ? null : Number(e.calificacion),
          observacion: e.observacion ?? ''
        }));
      });
  }
}
