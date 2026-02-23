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

  // Acordeón (agrupado por estudiante)
  groups: Array<{ id: number; estudiante: string; carrera: string; documentos: any[] }> = [];
  // Índice rápido por documento
  private docIndex = new Map<number, any>();
  loading = false;
  page = 1;
  pageSize = 30;
  totalPages = 1;
  total = 0;
  // Control de estado por fila (expuestas al template)
  processing = new Set<number>();
  decided = new Set<number>();
  // Estado visual por documento (en_revision | aprobado | rechazado)
  statuses: Record<number, 'en_revision'|'aprobado'|'rechazado'> = {};

  expandedStudentId: number | null = null;

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
    this.groups = [];
    this.docIndex = new Map();
    this.loading = false;
    this.page = 1;
    this.pageSize = 30;
    this.totalPages = 1;
    this.total = 0;
    this.processing = new Set<number>();
    this.decided = new Set<number>();
    this.statuses = {};
    this.expandedStudentId = null;
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
        const allowed = new Set([
          'solicitud',
          'oficio',
          'cert_vinculacion',
          'cert_practicas',
          'cert_ingles',
          'cert_no_adeudar',
          'cert_aprobacion_malla',
        ]);
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
        // Agrupar por usuario para acordeón por estudiante
        const byUser = new Map<number, { id: number; estudiante: string; carrera: string; documentos: any[] }>();
        const idx = new Map<number, any>();
        for (const d of data) {
          const docId = Number(d?.documento_id ?? d?.id_document ?? d?.id);
          const uid = Number(d?.usuario_id ?? d?.id_user ?? d?.id_owner);
          if (!Number.isFinite(uid) || !Number.isFinite(docId)) continue;

          const nombre = d?.users
            ? `${String(d.users.firstname || '').trim()} ${String(d.users.lastname || '').trim()}`.trim()
            : (String(d?.fullname || d?.estudiante || '').trim());

          const carrera = String(
            d?.career_name ?? d?.career ?? d?.carrera ?? d?.carrera_nombre ?? (d as any)?.careerName ?? '-'
          ).trim() || '-';

          const g = byUser.get(uid) || { id: uid, estudiante: (nombre || `Usuario ${uid}`), carrera: carrera || '-', documentos: [] as any[] };
          if (g.carrera === '-' && carrera !== '-') g.carrera = carrera;

          const view = {
            id: docId,
            estudiante: g.estudiante,
            carrera: g.carrera,
            tipo: d?.tipo,
            usuario_id: uid,
            filename: d?.nombre_archivo ?? d?.filename ?? d?.name,
            created_at: d?.creado_en ?? d?.created_at ?? d?.createdAt,
            estado: d?.estado || 'en_revision',
          };
          g.documentos.push(view);
          idx.set(docId, view);
          byUser.set(uid, g);
        }

        const groups = Array.from(byUser.values())
          .map(g => ({
            ...g,
            documentos: (g.documentos || []).sort((a: any, b: any) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))),
          }))
          .sort((a, b) => String(a.estudiante || '').localeCompare(String(b.estudiante || '')));

        this.groups = groups;
        this.docIndex = idx;
        if (this.expandedStudentId && !this.groups.some(g => g.id === this.expandedStudentId)) {
          this.expandedStudentId = null;
        }

        // Inicializar estado visual por defecto
        for (const g of this.groups) {
          for (const it of (g.documentos || [])) {
            const st = (it as any).estado as ('en_revision'|'aprobado'|'rechazado'|undefined);
            this.statuses[it.id] = (st || 'en_revision');
          }
        }
      },
      error: () => this.toast.error('No se pudo cargar documentos'),
      complete: () => { this.loading = false; }
    });
  }

  get filteredGroups() {
    const q = this.search.trim().toLowerCase();
    return (this.groups || []).filter(g => (!q || String(g.estudiante || '').toLowerCase().includes(q)));
  }

  toggleGroup(id: number) {
    this.expandedStudentId = this.expandedStudentId === id ? null : id;
  }

  getGroupSummary(g: { id: number; documentos: any[] }) {
    const docs = (g?.documentos || []) as any[];
    const total = docs.length;
    let approved = 0;
    let rejected = 0;
    let pending = 0;
    for (const d of docs) {
      const st = this.statuses[Number(d?.id)] || 'en_revision';
      if (st === 'aprobado') approved++;
      else if (st === 'rechazado') rejected++;
      else pending++;
    }
    const status: 'aprobado'|'rechazado'|'en_revision' = rejected > 0 ? 'rechazado' : (pending > 0 ? 'en_revision' : 'aprobado');
    return { total, approved, rejected, pending, status };
  }

  private getDocById(id: number) {
    return this.docIndex.get(Number(id));
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
    const it = this.getDocById(id);
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
    const it = this.getDocById(id);
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

  mapTipo(t: string): string {
    switch (t) {
      case 'solicitud': return 'Solicitud';
      case 'oficio': return 'Oficio';
      case 'cert_vinculacion': return 'Cert. Vinculación';
      case 'cert_practicas': return 'Cert. Prácticas';
      case 'cert_ingles': return 'Cert. Inglés';
      case 'cert_no_adeudar': return 'Certificado de no adeudar';
      case 'cert_aprobacion_malla': return 'Certificado de aprobación malla';
      default: return 'Documento';
    }
  }
}
