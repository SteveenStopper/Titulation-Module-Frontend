import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DocumentsService } from '../../../services/documents.service';
import { SecretariaService, SecretariaPromedioItem } from '../../../services/secretaria.service';
import { NotificationsService } from '../../../services/notifications.service';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-nota-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule],
  templateUrl: './nota-estudiantes.html',
  styleUrl: './nota-estudiantes.scss'
})
export class NotaEstudiantes {
  // Configuración
  minNota = 7; // Nota mínima requerida por semestre (escala 0 - 10)

  // Cantidad de semestres por carrera (4 o 5)
  semestresPorCarrera: Record<string, number> = {
    'Sistemas': 5,
    'Electromecánica': 5,
    'Contabilidad': 4,
  };

  // Búsqueda simple
  search = '';
  // Filtro por carrera
  carreraFiltro = '';
  // Estado
  loading = false;
  page = 1;
  pageSize = 20;

  // Lista de carreras (únicas) derivada de los datos
  get carreras(): string[] {
    return Array.from(new Set(this.items.map(e => e.carrera)));
  }

  // Datos desde backend
  items: SecretariaPromedioItem[] = [];

  // Modal rechazo
  showRejectDialog = false;
  rejectObs = '';
  rejectTargetId: number | null = null;

  // Lista filtrada
  get filtered() {
    const q = this.search.trim().toLowerCase();
    return this.items.filter(e =>
      (!this.carreraFiltro || e.carrera === this.carreraFiltro) &&
      (!q || (e.nombre || '').toLowerCase().includes(q))
    );
  }

  get mostrarS5(): boolean {
    return this.filtered.some(e => typeof (e as any).s5 === 'number');
  }

  get mostrarS4(): boolean {
    return this.filtered.some(e => typeof (e as any).s4 === 'number');
  }

  private semestresDe(e: any): number {
    const carrera = String(e?.carrera || '').trim();
    if (carrera === 'TECNOLOGÍA EN EDUCACIÓN BÁSICA') return 4;
    return 3;
  }

  private valoresDe(e: any): Array<number | null> {
    const n = this.semestresDe(e);
    const arr = [e.s1, e.s2, e.s3, e.s4, null];
    return arr.slice(0, n);
  }

  promedio(e: any) {
    if (typeof e?.promedio_general === 'number') {
      return Math.round(e.promedio_general * 100) / 100;
    }
    const vals = this.valoresDe(e).filter((v: number | null) => typeof v === 'number') as number[];
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }

  sinNotas(e: any) {
    return this.valoresDe(e).some((v: number | null) => v === null || v === undefined);
  }

  tieneBajas(e: any) {
    return this.valoresDe(e).some((v: number | null) => typeof v === 'number' && v < this.minNota);
  }

  elegible(e: any) {
    return !this.sinNotas(e) && !this.tieneBajas(e);
  }

  canReconsider(e: any): boolean {
    return (e as any)?.estado === 'rechazado';
  }

  canGenerate(e: any): boolean {
    const docId = Number((e as any)?.certificado_doc_id);
    return (e as any)?.estado === 'aprobado' && !(Number.isFinite(docId) && docId > 0);
  }

  canView(e: any): boolean {
    const docId = Number((e as any)?.certificado_doc_id);
    return (e as any)?.estado === 'aprobado' && Number.isFinite(docId) && docId > 0;
  }

  constructor(
    private secretaria: SecretariaService,
    private documents: DocumentsService,
    private toast: ToastrService,
    private notifications: NotificationsService,
  ) {
    this.loadPromedios();
  }

  loadPromedios() {
    this.loading = true;
    this.secretaria.listPromedios(this.page, this.pageSize)
      .subscribe({
        next: (resp) => {
          this.items = resp?.data || [];
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'No se pudo cargar promedios');
        }
      });
  }

  generarCertificado(estudiante_id: number) {
    const e = this.items.find(x => x.estudiante_id === estudiante_id);
    if (!e) return;
    if (!this.elegible(e)) { this.toast.warning('El estudiante no cumple los requisitos'); return; }
    if (!this.canGenerate(e)) { this.toast.info('El certificado ya fue generado'); return; }
    this.secretaria.generarCertNotas(estudiante_id).subscribe({
      next: (res: any) => {
        const docId = res?.documento_id || res?.documentId || res?.id || res?.document?.id || res?.certificado_doc_id;
        if (!docId) { this.toast.info('Certificado generado, pero no se obtuvo el documento'); return; }
        (e as any).certificado_doc_id = Number(docId);
        this.documents.download(docId).subscribe(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `certificado_notas_${(e.nombre || 'estudiante').replace(/\s+/g, '_')}.pdf`;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            try { URL.revokeObjectURL(url); } catch (_) { }
            try { document.body.removeChild(a); } catch (_) { }
          }, 1500);
        });
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'No se pudo generar el certificado');
      }
    });
  }

  verCertificado(estudiante_id: number) {
    const e = this.items.find(x => x.estudiante_id === estudiante_id);
    if (!e) return;
    const docId = Number((e as any).certificado_doc_id);
    if (!Number.isFinite(docId) || docId <= 0) return;
    this.documents.download(docId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        // Abrir en nueva pestaña (ver) + permitir guardar manualmente
        try { window.open(url, '_blank'); } catch (_) { /* ignore */ }
        // Fallback: también disparar descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado_notas_${(e.nombre || 'estudiante').replace(/\s+/g, '_')}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (_) { }
          try { document.body.removeChild(a); } catch (_) { }
        }, 1500);
      },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo descargar el certificado'),
    });
  }

  aceptar(estudiante_id: number) {
    const e = this.items.find(x => x.estudiante_id === estudiante_id);
    if (!e) return;
    if (!this.elegible(e)) { this.toast.warning('El estudiante no cumple los requisitos'); return; }
    this.secretaria.approve(estudiante_id).subscribe({
      next: () => {
        (e as any).estado = 'aprobado';
        this.toast.success('Aprobado correctamente');
      },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo aprobar')
    });
  }

  reconsiderar(estudiante_id: number) {
    const e = this.items.find(x => x.estudiante_id === estudiante_id);
    if (!e) return;
    if (!this.canReconsider(e)) return;
    this.loading = true;
    this.secretaria.reconsiderar(estudiante_id).subscribe({
      next: () => {
        this.toast.success('Reactivado');
        this.loading = false;
        this.loadPromedios();
      },
      error: (err) => {
        this.loading = false;
        this.toast.error(err?.error?.message || 'No se pudo reactivar');
      }
    });
  }

  rechazar(estudiante_id: number) {
    const e = this.items.find(x => x.estudiante_id === estudiante_id);
    if (!e) return;
    this.rejectTargetId = estudiante_id;
    this.rejectObs = '';
    this.showRejectDialog = true;
  }

  confirmReject() {
    if (!this.rejectTargetId) return;
    const estudiante_id = this.rejectTargetId;
    const obs = (this.rejectObs || '').trim();
    if (!obs) { this.toast.warning('La observación es obligatoria'); return; }
    this.secretaria.reject(estudiante_id, obs).subscribe({
      next: () => {
        const e = this.items.find(x => x.estudiante_id === estudiante_id);
        if (e) (e as any).estado = 'rechazado';
        this.notifications.create({
          id_user: estudiante_id,
          type: 'secretaria_rechazo',
          title: 'Secretaría: Validación rechazada',
          message: obs,
          entity_type: 'secretaria',
          entity_id: estudiante_id,
        }).subscribe({
          next: () => this.toast.info('Rechazado y notificado'),
          error: () => this.toast.error('No se pudo enviar la notificación'),
        });
        this.showRejectDialog = false;
        this.rejectTargetId = null;
        this.rejectObs = '';
      },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo rechazar'),
    });
  }

  cancelReject() {
    this.showRejectDialog = false;
    this.rejectTargetId = null;
    this.rejectObs = '';
  }
}
