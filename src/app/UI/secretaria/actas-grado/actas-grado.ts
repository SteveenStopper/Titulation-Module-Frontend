import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-actas-grado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actas-grado.html',
  styleUrl: './actas-grado.scss'
})
export class ActasGrado {
  activeTab: 'uic' | 'complexivo' = 'uic';

  pageUic = 1;
  pageComplexivo = 1;
  pageSize = 10;

  items: Array<{
    id: number;
    estudiante: string;
    carrera: string | null;
    tribunal: string;
    calificacionTribunal: number | null;
    hojaCargada: boolean;
    hojaDocumentoId?: number | null;
    guardado: boolean;
  }> = [];

  get totalPagesUic(): number {
    const total = (this.items || []).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get pagedItems() {
    const list = this.items || [];
    const start = (this.pageUic - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  get totalPagesComplexivo(): number {
    const total = (this.complexivoItems || []).length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get pagedComplexivoItems() {
    const list = this.complexivoItems || [];
    const start = (this.pageComplexivo - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  }

  setPageUic(p: number) {
    const next = Number(p);
    if (!Number.isFinite(next)) return;
    if (next < 1 || next > this.totalPagesUic) return;
    this.pageUic = next;
  }

  setPageComplexivo(p: number) {
    const next = Number(p);
    if (!Number.isFinite(next)) return;
    if (next < 1 || next > this.totalPagesComplexivo) return;
    this.pageComplexivo = next;
  }

  private toast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
  }

  complexivoItems: Array<{
    id: number;
    estudiante: string;
    carrera: string | null;
    calificacionComplexivo: number | null;
    actaDocumentoId?: number | null;
    actaEstado?: string | null;
    guardado: boolean;
  }> = [];

  canUploadActaComplexivo(it: { actaDocumentoId?: number | null; actaEstado?: string | null }): boolean {
    const hasDoc = Number.isFinite(Number(it?.actaDocumentoId));
    if (!hasDoc) return true;
    const estado = String(it?.actaEstado || '').toLowerCase();
    // Permitir volver a subir siempre que NO esté aprobado.
    // Esto corrige el caso donde el backend aún no envía estado (o llega vacío)
    // y el botón quedaba deshabilitado incorrectamente.
    return estado !== 'aprobado';
  }

  constructor(private http: HttpClient) {
    this.cargar();
  }

  isCalificacionValida(it: { calificacionTribunal: number | null }): boolean {
    return typeof it.calificacionTribunal === 'number' && it.calificacionTribunal >= 0 && it.calificacionTribunal <= 10;
  }

  isCalificacionComplexivoValida(it: { calificacionComplexivo: number | null }): boolean {
    return typeof it.calificacionComplexivo === 'number' && it.calificacionComplexivo >= 0 && it.calificacionComplexivo <= 10;
  }

  canGuardarUIC(it: { calificacionTribunal: number | null; hojaCargada: boolean }): boolean {
    return !!it.hojaCargada && this.isCalificacionValida(it);
  }

  canGenerarActaUIC(it: { guardado: boolean }): boolean {
    return !!it.guardado;
  }

  canGuardarComplexivo(it: { calificacionComplexivo: number | null; actaDocumentoId?: number | null }): boolean {
    return Number.isFinite(Number(it?.actaDocumentoId)) && this.isCalificacionComplexivoValida(it);
  }

  canGenerarActaComplexivo(it: { guardado: boolean }): boolean {
    return !!it.guardado;
  }

  generarHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    this.http.post('/api/secretaria/actas/hoja', { id_user_student: id }, { responseType: 'blob', observe: 'response' })
      .subscribe({
        next: (resp) => {
          const blob = resp.body as Blob;
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
          } else { this.toast('No se recibió el archivo de la hoja.', 'warning'); }
        },
        error: (err) => {
          if (err?.status === 501) this.toast('La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.', 'warning');
          else this.toast('No se pudo generar la hoja.', 'error');
        }
      });
  }

  cargarHoja(id: number) {
    // Mantener compatibilidad si alguien llama este método por error
    this.toast('Usa el botón Cargar hoja de tribunal para seleccionar el archivo PDF.', 'warning');
  }

  onFileSelected(event: Event, id: number) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    const form = new FormData();
    form.append('file', file);
    form.append('tipo', 'uic_acta_tribunal');
    form.append('usuario_id', String(id));
    this.http.post<any>('/api/documents', form).subscribe({
      next: (doc) => {
        const documento_id = Number(doc?.documento_id);
        if (!Number.isFinite(documento_id)) { this.toast('Subida OK, pero no se obtuvo documento_id', 'warning'); return; }
        this.http.put('/api/secretaria/actas/link-hoja', { id_user_student: id, documento_id }).subscribe({
          next: () => {
            it.hojaCargada = true;
            it.hojaDocumentoId = documento_id;
            this.toast('Hoja subida y vinculada.', 'success');
          },
          error: () => { this.toast('No se pudo vincular la hoja.', 'error'); }
        });
      },
      error: (err) => {
        this.toast(err?.error?.message || 'No se pudo subir el archivo.', 'error');
      }
    });
  }

  verHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    const docId = Number(it?.hojaDocumentoId);
    if (!Number.isFinite(docId)) return;
    this.http.get(`/api/documents/${docId}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast('No se pudo abrir el documento.', 'error')
    });
  }

  borrarHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    const docId = Number(it?.hojaDocumentoId);
    if (!Number.isFinite(docId)) return;
    // 1) desvincular acta_doc_id
    this.http.put('/api/secretaria/actas/unlink-hoja', { id_user_student: id }).subscribe({
      next: () => {
        // 2) borrar documento
        this.http.delete(`/api/documents/${docId}`).subscribe({
          next: () => {
            it.hojaCargada = false;
            it.hojaDocumentoId = null;
            it.guardado = false;
            this.toast('Documento eliminado.', 'success');
          },
          error: () => this.toast('Se desvinculó, pero no se pudo eliminar el archivo.', 'warning')
        });
      },
      error: () => this.toast('No se pudo desvincular el documento.', 'error')
    });
  }

  onFileSelectedComplexivo(event: Event, id: number) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    const it = this.complexivoItems.find(x => x.id === id);
    if (!it) return;
    const form = new FormData();
    form.append('file', file);
    form.append('tipo', 'comprobante_acta_grado');
    form.append('usuario_id', String(id));
    this.http.post<any>('/api/documents', form).subscribe({
      next: (doc) => {
        const documento_id = Number(doc?.documento_id);
        if (!Number.isFinite(documento_id)) { this.toast('Subida OK, pero no se obtuvo documento_id', 'warning'); return; }
        this.http.put('/api/secretaria/actas/complexivo/link-acta', { id_user_student: id, documento_id }).subscribe({
          next: () => {
            it.actaDocumentoId = documento_id;
            it.actaEstado = 'en_revision';
            this.toast('Acta subida y vinculada.', 'success');
          },
          error: () => this.toast('No se pudo vincular el acta.', 'error')
        });
      },
      error: (err) => this.toast(err?.error?.message || 'No se pudo subir el archivo.', 'error')
    });
  }

  verActaComplexivo(id: number) {
    const it = this.complexivoItems.find(x => x.id === id);
    const docId = Number(it?.actaDocumentoId);
    if (!Number.isFinite(docId)) return;
    this.http.get(`/api/documents/${docId}/download`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast('No se pudo abrir el documento.', 'error')
    });
  }

  borrarActaComplexivo(id: number) {
    const it = this.complexivoItems.find(x => x.id === id);
    if (!it) return;
    const docId = Number(it?.actaDocumentoId);
    if (!Number.isFinite(docId)) return;
    this.http.put('/api/secretaria/actas/complexivo/unlink-acta', { id_user_student: id }).subscribe({
      next: () => {
        this.http.delete(`/api/documents/${docId}`).subscribe({
          next: () => {
            it.actaDocumentoId = null;
            it.actaEstado = null;
            it.guardado = false;
            this.toast('Documento eliminado.', 'success');
          },
          error: () => this.toast('Se desvinculó, pero no se pudo eliminar el archivo.', 'warning')
        });
      },
      error: () => this.toast('No se pudo desvincular el documento.', 'error')
    });
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.canGuardarUIC(it)) return;
    this.http.put('/api/secretaria/actas/nota', { id_user_student: id, score: it.calificacionTribunal }).subscribe({
      next: () => { it.guardado = true; this.toast('Calificación guardada.', 'success'); },
      error: () => { this.toast('No se pudo guardar la calificación.', 'error'); }
    });
  }

  generarActaComplexivo(id: number) {
    const it = this.complexivoItems.find(x => x.id === id);
    if (!it || !this.canGenerarActaComplexivo(it)) return;
    this.http.post('/api/secretaria/actas/complexivo/acta', { id_user_student: id }, { responseType: 'blob', observe: 'response' })
      .subscribe({
        next: (resp) => {
          const blob = resp.body as Blob;
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
          } else { this.toast('No se recibió el archivo del acta.', 'warning'); }
        },
        error: (err) => {
          if (err?.status === 501) this.toast('La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.', 'warning');
          else this.toast('No se pudo generar el acta.', 'error');
        }
      });
  }

  guardarComplexivo(id: number) {
    const it = this.complexivoItems.find(x => x.id === id);
    if (!it) return;
    if (!this.canGuardarComplexivo(it)) return;
    this.http.put('/api/secretaria/actas/complexivo/nota', { id_user_student: id, score: it.calificacionComplexivo }).subscribe({
      next: () => { it.guardado = true; this.toast('Calificación guardada.', 'success'); },
      error: () => { this.toast('No se pudo guardar la calificación.', 'error'); }
    });
  }

  private cargar() {
    this.http.get<Array<{ id: number; estudiante: string; carrera: string | null; tribunal: string; calificacionTribunal: number | null; hojaCargada: boolean; hojaDocumentoId?: number | null }>>('/api/secretaria/actas')
      .subscribe(list => {
        this.items = (Array.isArray(list) ? list : []).map(r => ({
          id: r.id,
          estudiante: r.estudiante,
          carrera: r.carrera ?? null,
          tribunal: r.tribunal,
          calificacionTribunal: r.calificacionTribunal,
          hojaCargada: !!r.hojaCargada,
          hojaDocumentoId: (r as any).hojaDocumentoId ?? null,
          guardado: false,
        }));

        this.pageUic = 1;
      });

    this.http.get<Array<{ id: number; estudiante: string; carrera: string | null; calificacionComplexivo: number | null; actaDocumentoId?: number | null; actaEstado?: string | null }>>('/api/secretaria/actas/complexivo')
      .subscribe(list => {
        this.complexivoItems = (Array.isArray(list) ? list : []).map(r => ({
          id: r.id,
          estudiante: r.estudiante,
          carrera: r.carrera ?? null,
          calificacionComplexivo: r.calificacionComplexivo == null ? null : Number(r.calificacionComplexivo),
          actaDocumentoId: (r as any).actaDocumentoId ?? null,
          actaEstado: (r as any).actaEstado ?? null,
          guardado: false,
        }));

        this.pageComplexivo = 1;
      });
  }
}
