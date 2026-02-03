import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { VouchersService } from '../../../services/vouchers.service';
import { NotificationsService } from '../../../services/notifications.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss'
})
export class Pagos {
  // Tabs
  tabs: Array<{ key: 'certificados' | 'titulacion' | 'acta'; label: string }> = [
    { key: 'certificados', label: 'Certificados' },
    { key: 'titulacion', label: 'Titulación' },
    { key: 'acta', label: 'Acta de Grado' }
  ];
  activeTab: 'certificados' | 'titulacion' | 'acta' = 'certificados';

  // Estado
  loading = false;
  items: any[] = [];
  page = 1;
  pageSize = 10;
  totalPages = 1;
  total = 0;
  search = '';

  setTab(tab: 'certificados' | 'titulacion' | 'acta') {
    this.activeTab = tab;
    this.load();
  }

  // Preview modal
  isPreviewOpen = false;
  previewUrl: string | null = null;
  previewSafeUrl: SafeResourceUrl | null = null;
  previewType: 'image' | 'pdf' | 'other' = 'other';
  previewTitle = 'Comprobante';
  // Image zoom
  zoomScale = 1;
  // Reject modal
  isRejectOpen = false;
  rejectObs: string = '';
  rejectTarget: any = null;
  actionLoading = false;

  constructor(private toast: ToastrService, private vouchers: VouchersService, private notifications: NotificationsService, private sanitizer: DomSanitizer) {
    this.load();
  }

  private tabToVType(): 'pago_certificado' | 'pago_titulacion' | 'pago_acta_grado' {
    if (this.activeTab === 'titulacion') return 'pago_titulacion';
    if (this.activeTab === 'acta') return 'pago_acta_grado';
    return 'pago_certificado';
  }

  load() {
    this.loading = true;
    this.vouchers.list({ v_type: this.tabToVType(), page: this.page, pageSize: this.pageSize }).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        // Compat: asegurar que cada item tenga 'id' poblado para el botón Ver actual
        this.items = rows.map((it: any) => ({
          ...it,
          estudiante: it?.estudiante || (it?.users ? `${String(it.users.firstname || '').trim()} ${String(it.users.lastname || '').trim()}`.trim() : undefined),
          carrera: it?.carrera || it?.career || undefined,
          referencia: it?.referencia || it?.reference || undefined,
          monto: it?.monto ?? it?.amount,
          id: Number(it?.id ?? it?.voucher_id ?? it?.id_voucher ?? it?.id_voucher ?? it?.documento_id ?? 0) || undefined,
        }));
        const pag = res?.pagination || {};
        this.total = Number(pag.total || this.items.length || 0);
        this.totalPages = Number(pag.totalPages || 1);
      },
      error: () => this.toast.error('No se pudo cargar la bandeja de pagos'),
      complete: () => { this.loading = false; }
    });
  }

  private openPreviewFromBlob(blob: Blob, filename: string, title?: string) {
    this.previewTitle = title || 'Comprobante';
    const lower = (filename || '').toLowerCase();
    let type: 'image' | 'pdf' | 'other' = 'other';
    if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/.test(lower)) type = 'image';
    else if (lower.endsWith('.pdf')) type = 'pdf';
    this.previewType = type;

    let blobForView = blob;
    if (type === 'pdf' && blob.type !== 'application/pdf') {
      blobForView = new Blob([blob], { type: 'application/pdf' });
    } else if (type === 'image' && !/^image\//.test(blob.type)) {
      const ext = lower.split('.').pop() || '';
      const mime = ext === 'png' ? 'image/png'
        : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
          : ext === 'webp' ? 'image/webp'
            : ext === 'gif' ? 'image/gif'
              : 'image/*';
      blobForView = new Blob([blob], { type: mime });
    }
    // Reset zoom on each open
    if (type === 'image') this.zoomScale = 1;
    const url = window.URL.createObjectURL(blobForView);
    this.previewUrl = url;
    this.previewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.isPreviewOpen = true;
  }

  verVoucher(item: any) {
    const id = Number(item?.id_voucher ?? item?.voucher_id ?? item?.id);
    if (!id) return;
    const filename = String(item?.filename || 'comprobante.pdf');
    this.vouchers.download(id).subscribe({
      next: (blob) => this.openPreviewFromBlob(blob, filename, 'Comprobante'),
      error: () => this.toast.error('No se pudo previsualizar el comprobante')
    });
  }

  // Compat: mientras actualizamos el HTML para usar verVoucher(it)
  verComprobante(id: any, isId: boolean = true) {
    const vid = Number(id);
    if (!isId || !vid) return;
    this.vouchers.download(vid).subscribe({
      next: (blob) => this.openPreviewFromBlob(blob, 'comprobante.pdf', 'Comprobante'),
      error: () => this.toast.error('No se pudo previsualizar el comprobante')
    });
  }

  cerrarPreview() {
    this.isPreviewOpen = false;
    if (this.previewUrl) {
      try { window.URL.revokeObjectURL(this.previewUrl); } catch { }
    }
    this.previewUrl = null;
    this.previewSafeUrl = null;
    this.previewType = 'other';
    this.previewTitle = 'Comprobante';
    this.zoomScale = 1;
  }

  // Zoom controls for images
  zoomIn() { this.zoomScale = Math.min(5, this.zoomScale + 0.25); }
  zoomOut() { this.zoomScale = Math.max(0.25, this.zoomScale - 0.25); }
  zoomReset() { this.zoomScale = 1; }

  // Toasts
  toasts: Array<{ id: number; message: string; type: 'success' | 'error' }> = [];
  private toastSeq = 1;
  showToast(message: string, type: 'success' | 'error' = 'success') {
    const id = this.toastSeq++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 3000);
  }

  // Acciones
  get filtered() {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(it =>
      String(it.estudiante || it.nombre || '').toLowerCase().includes(q) ||
      String(it.reference || it.referencia || '').toLowerCase().includes(q)
    );
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
  aprobar(item: any) {
    const id = item?.id ?? item?.voucher_id;
    const studentId = item?.id_user ?? item?.usuario_id;
    if (!id) return;
    this.actionLoading = true;
    this.vouchers.approve(Number(id)).subscribe({
      next: () => {
        if (studentId) {
          this.notifications.create({
            id_user: Number(studentId),
            type: 'tesoreria_aprobado',
            title: 'Tesorería: Comprobante aprobado',
            message: 'Tu comprobante fue aprobado',
            entity_type: 'voucher',
            entity_id: Number(id),
          }).subscribe({ complete: () => { } });
        }
        this.toast.success('Aprobado');
        // Mantener la fila y actualizar estado
        this.items = this.items.map(v => ((v?.id ?? v?.voucher_id) === id ? { ...v, status: 'aprobado', estado: 'aprobado' } : v));
      },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo aprobar'),
      complete: () => { this.actionLoading = false; }
    });
  }

  rechazar(item: any) {
    this.rejectTarget = item;
    this.rejectObs = '';
    this.isRejectOpen = true;
  }

  cancelarRechazo() {
    if (this.actionLoading) return;
    this.isRejectOpen = false;
    this.rejectObs = '';
    this.rejectTarget = null;
  }

  confirmarRechazo() {
    const item = this.rejectTarget;
    const obs = (this.rejectObs || '').trim();
    const id = item?.id ?? item?.voucher_id;
    const studentId = item?.id_user ?? item?.usuario_id;
    if (!id || !obs) return;
    this.actionLoading = true;
    this.vouchers.reject(Number(id), obs).subscribe({
      next: () => {
        if (studentId) {
          this.notifications.create({
            id_user: Number(studentId),
            type: 'tesoreria_rechazo',
            title: 'Tesorería: Comprobante rechazado',
            message: obs,
            entity_type: 'voucher',
            entity_id: Number(id),
          }).subscribe({ complete: () => { } });
        }
        this.toast.info('Rechazado');
        // Mantener la fila y actualizar estado/observación
        this.items = this.items.map(v => ((v?.id ?? v?.voucher_id) === id
          ? { ...v, status: 'rechazado', estado: 'rechazado', observation: obs, observacion: obs }
          : v));
        this.isRejectOpen = false;
        this.rejectObs = '';
        this.rejectTarget = null;
      },
      error: (err) => this.toast.error(err?.error?.message || 'No se pudo rechazar'),
      complete: () => { this.actionLoading = false; }
    });
  }
}
