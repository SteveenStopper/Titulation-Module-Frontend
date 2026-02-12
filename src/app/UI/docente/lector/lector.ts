import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-lector-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lector.html',
  styleUrl: './lector.scss'
})
export class LectorDocente {
  estudiantes: Array<{ id: string; nombre: string; carrera: string | null; documentoUrl?: string | null; documentoId?: number | null; calificacion: number | null; observacion: string; reviewSaved: boolean; editing: boolean }>
    = [];

  hasChanges = false;
  saving = false;
  isAdmin = false;

  constructor(private http: HttpClient, private auth: AuthService) {
    this.isAdmin = this.auth.hasRole('Administrador');
    this.cargarLista();
  }

  markChanged() {
    this.hasChanges = true;
  }

  isInputDisabled(e: { reviewSaved: boolean; editing: boolean }) {
    if (this.isAdmin) return !e.editing;
    return e.reviewSaved;
  }

  toggleEditar(e: { editing: boolean }) {
    if (!this.isAdmin) return;
    e.editing = !e.editing;
    if (!e.editing) this.hasChanges = false;
  }

  guardar() {
    if (this.saving || !this.hasChanges) return;
    this.saving = true;
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
      next: () => {
        this.hasChanges = false;
        for (const e of this.estudiantes) {
          e.reviewSaved = true;
          if (!this.isAdmin) e.editing = false;
        }
        Swal.fire({
          icon: 'success',
          title: 'Guardado',
          text: 'Calificaciones y observaciones guardadas.',
          confirmButtonText: 'Aceptar',
          customClass: { confirmButton: 'swal-btn-confirm' }
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al guardar. Intenta nuevamente.',
          confirmButtonText: 'Aceptar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  verDocumento(e: { documentoId?: number | null; documentoUrl?: string | null; nombre: string }) {
    const docId = e.documentoId != null ? Number(e.documentoId) : null;
    if (docId && Number.isFinite(docId)) {
      this.http.get(`/api/documents/${docId}/download`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'No autorizado',
            text: 'No autorizado para ver el documento',
            confirmButtonText: 'Aceptar',
            customClass: { confirmButton: 'swal-btn-cancel' }
          });
        }
      });
      return;
    }

    const raw = e.documentoUrl != null ? String(e.documentoUrl).trim() : '';
    if (raw) {
      let url = raw;
      if (!/^https?:\/\//i.test(url)) {
        const apiBase = (window as any).__API_BASE__ || `${window.location.origin}/api`;
        const backendBase = String(apiBase).replace(/\/+$/, '').replace(/\/api$/, '');
        if (!url.startsWith('/')) url = '/' + url;
        url = backendBase + url;
      }
      window.open(url, '_blank', 'noopener');
      return;
    }

    Swal.fire({
      icon: 'info',
      title: 'Sin documento',
      text: `El estudiante ${e.nombre} aún no tiene documento disponible.`,
      confirmButtonText: 'Aceptar',
      customClass: { confirmButton: 'swal-btn-confirm' }
    });
  }

  private cargarLista() {
    this.http.get<Array<{ id: string; nombre: string; carrera: string | null; documentoUrl?: string | null; documentoId?: number | null; calificacion?: number | null; observacion?: string }>>('/api/docente/lector/estudiantes')
      .subscribe(list => {
        this.estudiantes = (Array.isArray(list) ? list : []).map(e => {
          const cal = e.calificacion == null ? null : Number(e.calificacion);
          const obs = e.observacion ?? '';
          const reviewSaved = cal != null || String(obs).trim().length > 0;
          return {
          id: e.id,
          nombre: e.nombre,
          carrera: e.carrera ?? null,
          documentoUrl: e.documentoUrl == null ? null : String(e.documentoUrl),
          documentoId: e.documentoId == null ? null : Number(e.documentoId),
          calificacion: cal,
          observacion: obs,
          reviewSaved,
          editing: this.isAdmin ? false : !reviewSaved,
          };
        });
        this.hasChanges = false;
        this.saving = false;
      });
  }
}
