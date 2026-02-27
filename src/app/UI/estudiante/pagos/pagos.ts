import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { VouchersService } from '../../../services/vouchers.service';
import { AuthService } from '../../../services/auth.service';
import { MeService } from '../../../services/me.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss'
})
export class Pagos {
  @ViewChild('voucherFile') voucherFile!: ElementRef<HTMLInputElement>;
  pago = { tipo: '', referencia: '', monto: null as number | null };
  pagoArchivo: File | null = null;
  pagoArchivoNombre = '';
  pagoEstado: 'enviado' | 'aprobado' | 'rechazado' | '' = '';
  dragOver = false;

  // Lock del formulario: solo habilitar para tipos faltantes o rechazados
  private readonly requiredVoucherTypes = ['pago_certificado', 'pago_titulacion', 'pago_acta_grado'] as const;
  private statusByType = new Map<string, 'aprobado' | 'rechazado' | 'en_revision' | ''>();

  // Validaciones (gating)
  validationsLoading = false;
  canProceed = true;
  validationsMsg = '';
  // Historial
  loading = false;
  items: any[] = [];

  get canRegisterPago(): boolean {
    if (this.validationsLoading || !this.canProceed) return false;
    if (!this.statusByType || this.statusByType.size === 0) return true;

    const allApproved = this.requiredVoucherTypes.every(t => this.statusByType.get(t) === 'aprobado');
    if (allApproved) return false;

    // Si existe algún rechazado o falta alguno, se permite registrar
    const hasRejected = this.requiredVoucherTypes.some(t => this.statusByType.get(t) === 'rechazado');
    const hasMissing = this.requiredVoucherTypes.some(t => !this.statusByType.get(t));
    return hasRejected || hasMissing;
  }

  get disabledPagoMsg(): string {
    const allApproved = this.requiredVoucherTypes.every(t => this.statusByType.get(t) === 'aprobado');
    return allApproved ? 'Ya tienes aprobados tus comprobantes. Solo podrás subir de nuevo si alguno es rechazado.' : '';
  }

  isTipoPagoEnabled(tipoUi: string): boolean {
    const mapTipo = (t: string): string => {
      if (t === 'titulacion') return 'pago_titulacion';
      if (t === 'certificados') return 'pago_certificado';
      if (t === 'acta_grado') return 'pago_acta_grado';
      return '';
    };
    const vtype = mapTipo(tipoUi);
    if (!vtype) return false;

    const st = this.statusByType.get(vtype);
    if (!st) return true; // no existe aún
    if (st === 'rechazado') return true;
    // en_revision o aprobado => bloquear para evitar reenvíos
    return false;
  }

  constructor(
    private toastr: ToastrService,
    private vouchers: VouchersService,
    private auth: AuthService,
    private me: MeService,
  ) {}

  ngOnInit() {
    this.validationsLoading = true;
    this.me.getProfile().subscribe({
      next: (profile: any) => {
        const tes = String(profile?.validations?.tesoreria_aranceles?.estado || '').toLowerCase();
        const sec = String(profile?.validations?.secretaria_promedios?.estado || '').toLowerCase();
        const ok = tes === 'approved' && sec === 'approved';
        this.canProceed = ok;
        this.validationsMsg = ok
          ? ''
          : 'Debes tener aprobados Arancel (Tesorería) y Notas (Secretaría) para continuar.';
      },
      complete: () => { this.validationsLoading = false; },
      error: () => {
        this.validationsLoading = false;
        this.canProceed = false;
        this.validationsMsg = 'No se pudo verificar tus validaciones. Intenta nuevamente.';
      }
    });
    this.loadHistorial();
  }

  loadHistorial() {
    const user = this.auth.currentUserValue;
    const id_user = user?.id_user;
    if (!id_user) return;
    this.loading = true;
    this.vouchers.list({ id_user }).subscribe({
      next: (res: any) => {
        const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        const allowed = new Set(['pago_titulacion','pago_certificado','pago_acta_grado']);
        const normalized = raw
          .map((v: any) => ({
            ...v,
            id_voucher: v?.id_voucher ?? v?.id ?? v?.voucher_id,
            voucher_type: v?.voucher_type ?? v?.v_type ?? v?.tipo,
            amount: v?.amount ?? v?.monto,
            reference: v?.reference ?? v?.referencia,
            created_at: v?.created_at ?? v?.fecha ?? v?.createdAt,
            status: v?.status ?? v?.estado,
            observation: v?.observation ?? v?.observacion,
          }))
          .filter((v: any) => allowed.has(String(v.voucher_type || '').toLowerCase()));

        this.items = normalized;

        // statusByType: tomar el último registro por fecha (fallback por id)
        const byType = new Map<string, any[]>();
        for (const it of normalized) {
          const t = String(it?.voucher_type || '').toLowerCase();
          if (!t) continue;
          if (!byType.has(t)) byType.set(t, []);
          byType.get(t)!.push(it);
        }
        this.statusByType = new Map();
        for (const [t, list] of byType.entries()) {
          const sorted = list.slice().sort((a, b) => {
            const da = a?.created_at ? new Date(a.created_at).getTime() : 0;
            const db = b?.created_at ? new Date(b.created_at).getTime() : 0;
            if (da !== db) return db - da;
            return Number(b?.id_voucher || 0) - Number(a?.id_voucher || 0);
          });
          const last = sorted[0];
          const st = String(last?.status || '').toLowerCase() as any;
          this.statusByType.set(t, (st === 'aprobado' || st === 'rechazado' || st === 'en_revision') ? st : '');
        }

        // Si el tipo seleccionado está bloqueado (aprobado/en revisión), limpiar selección
        if (this.pago?.tipo && !this.isTipoPagoEnabled(this.pago.tipo)) {
          this.pago = { tipo: '', referencia: '', monto: null };
          this.pagoArchivo = null;
          this.pagoArchivoNombre = '';
          try { if (this.voucherFile?.nativeElement) this.voucherFile.nativeElement.value = ''; } catch {}
        }
      },
      error: () => this.toastr.error('No se pudo cargar el historial de pagos'),
      complete: () => { this.loading = false; }
    });
  }

  private isAllowedVoucherFile(file: File): boolean {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();
    const allowedExt = ['pdf', 'png', 'jpg', 'jpeg'];
    const allowedMime = ['application/pdf', 'image/png', 'image/jpeg'];
    return allowedExt.includes(ext) && allowedMime.includes(mime);
  }

  setPagoFile(file: File | null) {
    if (!file) {
      this.pagoArchivo = null;
      this.pagoArchivoNombre = '';
      return;
    }
    if (!this.isAllowedVoucherFile(file)) {
      this.toastr.error('Solo se permiten PDF o imágenes (png, jpg, jpeg)');
      this.pagoArchivo = null;
      this.pagoArchivoNombre = '';
      try { if (this.voucherFile?.nativeElement) this.voucherFile.nativeElement.value = ''; } catch {}
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.toastr.error('El archivo excede el límite de 20MB');
      this.pagoArchivo = null;
      this.pagoArchivoNombre = '';
      try { if (this.voucherFile?.nativeElement) this.voucherFile.nativeElement.value = ''; } catch {}
      return;
    }
    this.pagoArchivo = file;
    this.pagoArchivoNombre = file.name;
  }

  onPagoFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.setPagoFile(file || null);
  }

  onVoucherDragOver(e: DragEvent) {
    e.preventDefault();
    if (this.validationsLoading || !this.canProceed) return;
    this.dragOver = true;
  }

  onVoucherDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
  }

  onVoucherDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    if (this.validationsLoading || !this.canProceed) return;
    const file = e.dataTransfer?.files && e.dataTransfer.files[0];
    this.setPagoFile(file || null);
  }

  submitPago() {
    if (!this.canRegisterPago) {
      this.toastr.info(this.disabledPagoMsg || 'No puedes registrar más pagos en este momento.');
      return;
    }
    if (!this.canProceed) {
      this.toastr.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    // Validaciones
    if (!this.pago.tipo || !this.pago.referencia || this.pago.monto === null || (this.pago.monto as number) < 0 || !this.pagoArchivo) {
      this.toastr.warning('Completa todos los campos y adjunta el comprobante');
      return;
    }
    const ext = (this.pagoArchivo.name.split('.').pop() || '').toLowerCase();
    const mime = this.pagoArchivo.type;
    const allowedExt = ['pdf','png','jpg','jpeg'];
    const allowedMime = ['application/pdf','image/png','image/jpeg'];
    if (!allowedExt.includes(ext) || !allowedMime.includes(mime)) {
      this.toastr.error('Solo se permiten PDF o imágenes (png, jpg, jpeg)');
      return;
    }
    if (this.pagoArchivo.size > 20 * 1024 * 1024) {
      this.toastr.error('El archivo excede el límite de 20MB');
      return;
    }

    const user = this.auth.currentUserValue;
    const id_user = user?.id_user;
    if (!id_user) { this.toastr.error('Sesión inválida'); return; }

    // Mapear tipo UI a v_type backend
    const mapTipo = (t: string): 'pago_titulacion' | 'pago_certificado' | 'pago_acta_grado' | 'otro' => {
      if (t === 'titulacion') return 'pago_titulacion';
      if (t === 'certificados') return 'pago_certificado';
      if (t === 'acta_grado') return 'pago_acta_grado';
      return 'otro';
    };

    const v_type = mapTipo(this.pago.tipo);
    if (!this.isTipoPagoEnabled(this.pago.tipo)) {
      this.toastr.info('Este tipo de comprobante ya está aprobado o en revisión. Solo puedes reenviar si fue rechazado.');
      return;
    }
    this.vouchers.create(this.pagoArchivo, {
      v_type,
      id_user,
      amount: this.pago.monto || undefined,
      reference: this.pago.referencia || undefined,
    }).subscribe({
      next: () => {
        this.toastr.success('Pago enviado a Tesorería');
        this.pagoEstado = 'enviado';
        this.pagoArchivo = null;
        this.pagoArchivoNombre = '';
        // limpiar input file real
        try { if (this.voucherFile?.nativeElement) this.voucherFile.nativeElement.value = ''; } catch {}
        this.pago = { tipo: '', referencia: '', monto: null };
        this.loadHistorial();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'No se pudo enviar el comprobante')
    });
  }

  descargar(item: any) {
    const id = item?.id_voucher ?? item?.id ?? item?.voucher_id;
    if (!id) return;
    this.vouchers.download(Number(id)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (item?.filename || 'comprobante') + '';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('No se pudo descargar el comprobante')
    });
  }

  labelTipo(t: string) {
    switch (t) {
      case 'pago_titulacion': return 'Titulación';
      case 'pago_certificado': return 'Certificados';
      case 'pago_acta_grado': return 'Acta de Grado';
      default: return 'Otro';
    }
  }

  labelEstado(s: string) {
    if (s === 'aprobado') return 'Aprobado';
    if (s === 'rechazado') return 'Rechazado';
    return 'En revisión';
  }
}
