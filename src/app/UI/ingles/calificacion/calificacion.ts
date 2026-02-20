import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
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
  private adminIngles = false;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.currentUserValue;
    this.adminIngles = !!user && (user.roles?.includes('Administrador') || user.roles?.includes('Ingles'));
    if (this.adminIngles) {
      this.cargarElegibles();
    } else {
      const nombre = user ? `${user.firstname} ${user.lastname}`.trim() : 'Yo';
      this.http.get<any>('/api/english/my').subscribe(data => {
        const score = (data && typeof data.score === 'number') ? Number(data.score) : null;
        const saved = data && (data.status === 'saved' || data.status === 'validated');
        this.items = [
          { id: Number(data?.id || 0), estudiante: nombre, carrera: '', nota: score, guardado: !!saved }
        ];
      }, _ => {
        this.items = [ { id: 0, estudiante: nombre, carrera: '', nota: null, guardado: false } ];
      });
    }
  }

  isNotaLista(it: { nota: number | null }): boolean {
    return typeof it.nota === 'number';
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id || id === 0);
    if (!it) return;
    if (!this.isNotaLista(it)) return;
    const score = Number(it.nota);
    if (this.adminIngles) {
      // En modo Admin/Inglés, 'estudiante' es el nombre del alumno y debemos guardar para ese usuario.
      const target = this.lookupTargetUserIdByNombre(it.estudiante);
      if (!target) {
        Swal.fire({
          title: 'No se pudo resolver',
          text: 'No se pudo resolver el estudiante.',
          icon: 'error',
          confirmButtonText: 'Cerrar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
        return;
      }
      this.http.post('/api/english/save-for', { target_user_id: target, score }).subscribe({
        next: (_res: any) => {
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
    } else {
      this.http.post('/api/english/save', { score }).subscribe({
        next: (res: any) => {
          it.guardado = true;
          if (res && typeof res.id === 'number') it.id = Number(res.id);
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
    const body = this.adminIngles ? { target_user_id: Number(it.id) } : {};
    this.http.post('/api/english/certificate', body, { responseType: 'blob', observe: 'response' }).subscribe({
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
    // Lista de estudiantes aprobados en Tesorería
    this.http.get<Array<{ id_user: number; fullname: string; career_name?: string|null; career?: string|null; certificate_doc_id?: number|null; score?: number|null; status?: string|null }>>('/api/english/eligible')
      .subscribe(rows => {
        const list = Array.isArray(rows) ? rows : [];
        this._eligibleMap = new Map<number, string>();
        this._reverseEligibleMap = new Map<string, number>();
        this.items = list.map(r => {
          this._eligibleMap.set(r.id_user, r.fullname);
          this._reverseEligibleMap.set(r.fullname, r.id_user);
          return {
            id: r.id_user, // usamos id_user como id local de fila
            estudiante: r.fullname,
            carrera: (r.career_name || r.career || ''),
            nota: r.score != null ? Number(r.score) : null,
            guardado: r.status === 'saved' || r.status === 'validated',
            certificate_doc_id: r.certificate_doc_id ?? null,
          };
        });
      });
  }

  private _eligibleMap = new Map<number, string>();
  private _reverseEligibleMap = new Map<string, number>();
  private lookupTargetUserIdByNombre(nombre: string): number | null {
    const id = this._reverseEligibleMap.get(nombre);
    return Number.isFinite(Number(id)) ? Number(id) : null;
  }
}
