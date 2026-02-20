import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-calificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificacion.html',
  styleUrl: './calificacion.scss'
})
export class Calificacion {
  items: Array<{ id: number; estudiante: string; carrera: string; nota: number | null; guardado: boolean; certificate_doc_id?: number | null }> = [];
  private allowed = false;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.currentUserValue;
    this.allowed = !!user && (user.roles?.includes('Administrador') || user.roles?.includes('Vinculacion_Practicas'));
    if (this.allowed) this.cargarElegibles();
  }

  isNotaLista(it: { nota: number | null }): boolean {
    return typeof it.nota === 'number';
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isNotaLista(it)) return;
    const score = Number(it.nota);
    this.http.post('/api/vinculacion/save-for', { target_user_id: id, score }).subscribe({
      next: () => {
        it.guardado = true;
        Swal.fire({
          title: 'Guardado',
          text: 'Calificación guardada.',
          icon: 'success',
          confirmButtonText: 'Aceptar',
          customClass: { confirmButton: 'swal-btn-confirm' }
        });
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo guardar la calificación.',
          icon: 'error',
          confirmButtonText: 'Cerrar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
      }
    });
  }

  verCertificado(id: number) {
    const it = this.items.find(x => x.id === id);
    const docId = Number(it?.certificate_doc_id);
    if (!Number.isFinite(docId)) return;
    this.http.get(`/api/documents/${docId}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo abrir el certificado.',
          icon: 'error',
          confirmButtonText: 'Cerrar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
      }
    });
  }

  generarCertificado(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!it.guardado) {
      Swal.fire({
        title: 'Primero guarde la nota',
        text: 'Para generar el certificado, primero debe guardar la calificación.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: 'swal-btn-confirm' }
      });
      return;
    }
    this.http.post('/api/vinculacion/certificate', { target_user_id: Number(id) }, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se recibió el archivo del certificado.',
            icon: 'error',
            confirmButtonText: 'Cerrar',
            customClass: { confirmButton: 'swal-btn-cancel' }
          });
        }
      },
      error: (err) => {
        if (err?.status === 501) {
          Swal.fire({
            title: 'No disponible',
            text: 'La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.',
            icon: 'warning',
            confirmButtonText: 'Aceptar',
            customClass: { confirmButton: 'swal-btn-confirm' }
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo generar el certificado.',
            icon: 'error',
            confirmButtonText: 'Cerrar',
            customClass: { confirmButton: 'swal-btn-cancel' }
          });
        }
      }
    });
  }

  private cargarElegibles() {
    this.http.get<Array<{ id_user: number; fullname: string; career_name?: string|null; career?: string|null; certificate_doc_id?: number|null; score?: number|null; status?: string|null }>>('/api/vinculacion/eligible')
      .subscribe(rows => {
        const list = Array.isArray(rows) ? rows : [];
        this.items = list.map(r => ({
          id: r.id_user,
          estudiante: r.fullname,
          carrera: (r.career_name || r.career || ''),
          nota: r.score != null ? Number(r.score) : null,
          guardado: r.status === 'saved' || r.status === 'validated',
          certificate_doc_id: r.certificate_doc_id ?? null,
        }));
      });
  }
}
