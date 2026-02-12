import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { DocumentsService } from '../../../services/documents.service';
import { NotificationsService } from '../../../services/notifications.service';
import { PeriodService } from '../../../services/period.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-secretaria-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matricula.html',
  styleUrl: './matricula.scss'
})
export class Matricula {
  // Búsqueda
  search = '';
  // Filtro por carrera (si backend provee campo en el futuro)
  carreraFiltro = '';

  // Lista renderizada desde backend
  items: any[] = [];
  loading = false;
  page = 1;
  pageSize = 10;
  totalPages = 1;
  total = 0;
  // Control de estado por fila (expuestas al template)
  processing = new Set<number>();
  decided = new Set<number>();
  // Estado visual por documento (en_revision | aprobado | rechazado)
  statuses: Record<number, 'en_revision'|'aprobado'|'rechazado'> = {};

  private destroyed$ = new Subject<void>();

  constructor(
    private toast: ToastrService,
    private documents: DocumentsService,
    private notifications: NotificationsService,
    private sanitizer: DomSanitizer,
    private periodSvc: PeriodService,
  ) {
    this.load();

    this.periodSvc.activePeriod$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.resetView();
        this.load();
      });
  }

  private resetView() {
    this.search = '';
    this.carreraFiltro = '';
    this.items = [];
    this.loading = false;
    this.page = 1;
    this.pageSize = 10;
    this.totalPages = 1;
    this.total = 0;
    this.processing = new Set<number>();
    this.decided = new Set<number>();
    this.statuses = {};
    this.isPreviewOpen = false;
    this.previewUrl = null;
    this.previewSafeUrl = null;
    this.previewType = 'other';
    this.previewTitle = 'Documento';
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  load() {
    this.loading = true;
    // Solo documentos de matrícula (excluir comprobantes de pagos)
    this.documents.list({ category: 'matricula_secretaria', page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res: any) => {
        const allowed = new Set(['solicitud', 'oficio', 'cert_vinculacion', 'cert_practicas', 'cert_ingles']);
        const data = (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []))
          .filter((d: any) => {
            const t = String(d?.tipo || '').toLowerCase();
            if (!t || !allowed.has(t)) return false;

            // Ocultar certificados AUTOGENERADOS (se guardan con nombre tipo: cert_ingles_*.pdf)
            // Pero mantener visibles los archivos que el estudiante sube manualmente aunque sean tipo cert_*.
            if (t === 'cert_ingles' || t === 'cert_practicas' || t === 'cert_vinculacion') {
              const fn = String(d?.nombre_archivo || d?.filename || '').toLowerCase();
              const autoPrefix = `${t}_`;
              if (fn && fn.startsWith(autoPrefix)) return false;
            }

            return true;
          });
        const pag = res?.pagination || {};
        this.total = Number(pag.total || 0);
        this.totalPages = Number(pag.totalPages || 1);
        // Agrupar por usuario para presentar por estudiante (simple)
        const byUser = new Map<number, any>();
        for (const d of data) {
          const uid = Number(d.usuario_id || d.id_user);
          if (!Number.isFinite(uid)) continue;
          const nombre = d?.users ? `${String(d.users.firstname || '').trim()} ${String(d.users.lastname || '').trim()}`.trim() : '';
          const g = byUser.get(uid) || { id: uid, estudiante: (nombre || `Usuario ${uid}`), carrera: '-', documentos: [] as any[] };
          g.documentos.push(d);
          byUser.set(uid, g);
        }
        // Expandimos a tabla por documento con campos amigables
        this.items = Array.from(byUser.values()).flatMap((g: any) => (
          g.documentos.map((d: any) => ({
            id: d.documento_id,
            estudiante: g.estudiante,
            carrera: g.carrera,
            tipo: d.tipo,
            usuario_id: d.usuario_id,
            filename: d.nombre_archivo,
            created_at: d.creado_en,
            estado: d.estado || 'en_revision',
          }))
        ));
        // Inicializar estado visual por defecto
        for (const it of this.items) {
          const st = (it as any).estado as ('en_revision'|'aprobado'|'rechazado'|undefined);
          this.statuses[it.id] = (st || 'en_revision');
        }
      },
      error: () => this.toast.error('No se pudo cargar documentos'),
      complete: () => { this.loading = false; }
    });
  }

  get filtered() {
    const q = this.search.trim().toLowerCase();
    return this.items.filter(i => (!q || String(i.estudiante || '').toLowerCase().includes(q)));
  }

  changePage(delta: number) {
    const next = this.page + delta;
    if (next < 1 || next > this.totalPages) return;
    this.page = next;
    this.load();
  }

  changePageSize(size: number) {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  // Toasts
  toasts: Array<{ id: number; message: string; type: 'success'|'error' }> = [];
  private toastSeq = 1;
  private showToast(message: string, type: 'success'|'error' = 'success') {
    const id = this.toastSeq++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // Acciones
  aceptar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (this.processing.has(id) || this.decided.has(id)) return;
    this.processing.add(id);
    // Persistir estado y notificar
    this.documents.setStatus(Number(id), 'aprobado').subscribe({
      next: () => {
        this.decided.add(id);
        this.statuses[id] = 'aprobado';
        this.showToast(`Documento aprobado`, 'success');
        // Notificación (no bloqueante)
        this.notifications.create({
          id_user: Number(it.usuario_id),
          type: 'secretaria_aprobado',
          title: 'Secretaría: Documento aprobado',
          message: `Tu documento (${this.mapTipo(it.tipo)}) fue aprobado`,
          entity_type: 'document',
          entity_id: Number(id),
        }).subscribe({ complete: () => {} });
      },
      error: () => {
        this.showToast('No se pudo actualizar el estado', 'error');
      },
      complete: () => { this.processing.delete(id); }
    });
  }

  // Modal de rechazo
  rejectOpen = false;
  rejectId: number | null = null;
  rejectObs = '';

  abrirRechazo(id: number) {
    if (this.processing.has(id) || this.decided.has(id)) return;
    this.rejectId = id;
    this.rejectObs = '';
    this.rejectOpen = true;
  }

  cancelarRechazo() {
    this.rejectOpen = false;
    this.rejectId = null;
    this.rejectObs = '';
  }

  confirmarRechazo() {
    const id = this.rejectId;
    const obs = (this.rejectObs || '').trim();
    if (!id || !obs) { this.showToast('La observación es obligatoria', 'error'); return; }
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    this.processing.add(id);
    this.documents.setStatus(Number(id), 'rechazado', obs).subscribe({
      next: () => {
        this.decided.add(id);
        this.statuses[id] = 'rechazado';
        this.showToast(`Documento rechazado`, 'success');
        // Notificación (no bloqueante)
        this.notifications.create({
          id_user: Number(it.usuario_id),
          type: 'secretaria_rechazo',
          title: 'Secretaría: Documento rechazado',
          message: obs,
          entity_type: 'document',
          entity_id: Number(id),
        }).subscribe({ complete: () => {} });
      },
      error: () => {
        this.showToast('No se pudo actualizar el estado', 'error');
      },
      complete: () => {
        this.processing.delete(id);
        this.cancelarRechazo();
      }
    });
  }

  // Preview modal
  isPreviewOpen = false;
  previewUrl: string | null = null;
  previewSafeUrl: SafeResourceUrl | null = null;
  previewType: 'image'|'pdf'|'other' = 'other';
  previewTitle = 'Documento';

  private openPreviewFromBlob(blob: Blob, filename: string, title?: string) {
    this.previewTitle = title || 'Documento';
    const lower = (filename || '').toLowerCase();
    // Detectar tipo por extensión si el blob viene con mime genérico
    let type: 'image'|'pdf'|'other' = 'other';
    if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) type = 'image';
    else if (lower.endsWith('.pdf')) type = 'pdf';
    this.previewType = type;

    let blobForView = blob;
    if (type === 'pdf' && blob.type !== 'application/pdf') {
      blobForView = new Blob([blob], { type: 'application/pdf' });
    } else if (type === 'image' && !/^image\//.test(blob.type)) {
      // Inferir mime de la extensión
      const ext = lower.split('.').pop() || '';
      const mime = ext === 'png' ? 'image/png'
        : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/*';
      blobForView = new Blob([blob], { type: mime });
    }

    const url = window.URL.createObjectURL(blobForView);
    this.previewUrl = url;
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isPreviewOpen = true;
  }

  verDocumento(item: any) {
    const id = item?.id;
    if (!id) return;
    this.documents.download(Number(id)).subscribe({
      next: (blob) => this.openPreviewFromBlob(blob, item?.filename || `${item?.tipo || 'documento'}.pdf`, this.mapTipo(item?.tipo)),
      error: () => this.toast.error('No se pudo descargar el documento')
    });
  }

  cerrarPreview() {
    this.isPreviewOpen = false;
    if (this.previewUrl) {
      try { window.URL.revokeObjectURL(this.previewUrl); } catch {}
    }
    this.previewUrl = null;
    this.previewSafeUrl = null;
    this.previewType = 'other';
    this.previewTitle = 'Documento';
  }

  private mapTipo(t: string): string {
    switch (t) {
      case 'solicitud': return 'Solicitud';
      case 'oficio': return 'Oficio';
      case 'cert_vinculacion': return 'Cert. Vinculación';
      case 'cert_practicas': return 'Cert. Prácticas';
      case 'cert_ingles': return 'Cert. Inglés';
      default: return 'Documento';
    }
  }
}
