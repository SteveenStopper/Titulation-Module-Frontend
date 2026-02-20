import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { DocumentsService } from '../../../services/documents.service';
import { MeService } from '../../../services/me.service';
import { AuthService } from '../../../services/auth.service';
import { VouchersService } from '../../../services/vouchers.service';

@Component({
  selector: 'app-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matricula.html',
  styleUrl: './matricula.scss'
})
export class Matricula {
  activeTab: 'requisitos' = 'requisitos';
  loading = false;
  // Checklist state
  listLoading = false;
  // Lista renderizada
  docsList: any[] = [];

  // Validaciones (gating)
  validationsLoading = false;
  canProceed = true;
  validationsMsg = '';

  // Requisitos form state
  requisitosHabilitados = true;
  reqArchivos: { solicitud?: File; oficio?: File; otro?: File } = {};
  reqNombres: { solicitud?: string; oficio?: string; otro?: string } = {};
  reqTipos: { solicitud?: string; oficio?: string; otro?: string } = {};
  solicitudTipos = ['Solicitud'];
  oficioTipos = ['Oficio'];
  otroTipos = [
    'Certificado de vinculación',
    'Certificado de prácticas pre profesionales',
    'Certificado de inglés',
    'Certificado de no adeudar',
    'Certificado de aprobación malla',
  ];
  // Para 'Otro documento' múltiple con tipo por archivo
  reqOtros: Array<{ file: File; nombre: string; tipo: string | '' }> = [];
  reqEstado: 'enviado' | 'aprobado' | 'rechazado' | '' = '';

  dragOverReq: { solicitud: boolean; oficio: boolean; otro: boolean } = { solicitud: false, oficio: false, otro: false };

  get hasOtrosSinTipo(): boolean {
    return this.reqOtros.some(o => !o.tipo);
  }

  get canSubmitRequisitos(): boolean {
    const hasSolicitud = !!this.reqArchivos.solicitud;
    const hasOficio = !!this.reqArchivos.oficio;
    const hasOtros = !!this.reqOtros.length;
    const hasAny = hasSolicitud || hasOficio || hasOtros;

    const solicitudOk = !hasSolicitud || !!(this.reqTipos.solicitud && this.reqTipos.solicitud.trim());
    const oficioOk = !hasOficio || !!(this.reqTipos.oficio && this.reqTipos.oficio.trim());

    return !!(
      this.requisitosHabilitados
      && hasAny
      && solicitudOk
      && oficioOk
      && !this.hasOtrosSinTipo
      && !this.loading
    );
  }
  constructor(
    private toast: ToastrService,
    private documents: DocumentsService,
    private me: MeService,
    private auth: AuthService,
    private vouchers: VouchersService,
  ) {}

  private swalError(msg: string) {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'error',
      title: msg,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
  }

  private swalWarn(msg: string) {
    return Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: msg,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
    });
  }

  ngOnInit() {
    this.validationsLoading = true;
    this.me.getProfile().subscribe({
      next: (profile: any) => {
        const tes = String(profile?.validations?.tesoreria_aranceles?.estado || '').toLowerCase();
        const sec = String(profile?.validations?.secretaria_promedios?.estado || '').toLowerCase();
        const okBase = tes === 'approved' && sec === 'approved';

        const user = this.auth.currentUserValue;
        const id_user = user?.id_user;
        if (!okBase || !id_user) {
          this.canProceed = false;
          this.requisitosHabilitados = false;
          this.validationsMsg = okBase
            ? 'No se pudo verificar tu usuario. Intenta nuevamente.'
            : 'Debes tener aprobados Arancel (Tesorería) y Notas (Secretaría) para continuar.';
          return;
        }

        this.vouchers.list({ id_user: Number(id_user), status: 'aprobado', page: 1, pageSize: 1 }).subscribe({
          next: (res: any) => {
            const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            const pagosAprobados = data.length > 0;
            this.canProceed = pagosAprobados;
            this.requisitosHabilitados = pagosAprobados;
            this.validationsMsg = pagosAprobados
              ? ''
              : 'Debes tener aprobados tus pagos para continuar a Matrícula.';
          },
          error: () => {
            this.canProceed = false;
            this.requisitosHabilitados = false;
            this.validationsMsg = 'No se pudo verificar el estado de tus pagos. Intenta nuevamente.';
          }
        });
      },
      complete: () => { this.validationsLoading = false; },
      error: () => {
        this.validationsLoading = false;
        this.canProceed = false;
        this.requisitosHabilitados = false;
        this.validationsMsg = 'No se pudo verificar tus validaciones. Intenta nuevamente.';
      }
    });
    this.loadChecklist();
  }

  loadChecklist() {
    this.listLoading = true;
    this.documents.list({ category: 'matricula', page: 1, pageSize: 100 }).subscribe({
      next: (res: any) => {
        // Backend puede responder {data: [...]} o lista directa
        const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        // Normalizar campos para facilitar el render y acciones
        this.docsList = raw.map((d: any) => ({
          ...d,
          id: Number(d?.id ?? d?.document_id ?? d?.documento_id),
          filename: d?.filename ?? d?.nombre ?? d?.nombre_archivo ?? '-',
          created_at: d?.created_at ?? d?.creado_en ?? d?.createdAt ?? d?.fecha ?? null,
          tipo: d?.tipo ?? d?.document_type ?? d?.doc_type ?? d?.voucher_type ?? 'otro',
          estado: d?.status ?? d?.estado ?? 'en_revision',
          observacion: d?.observacion ?? d?.observation ?? null,
        }));
      },
      error: () => this.toast.error('No se pudo cargar el checklist de documentos'),
      complete: () => { this.listLoading = false; }
    } as any);
  }

  onReqFile(e: Event, tipo: 'solicitud'|'oficio'|'otro') {
    if (!this.requisitosHabilitados) {
      this.toast.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    const input = e.target as HTMLInputElement;
    if (tipo === 'otro') {
      const files = (input.files ? Array.from(input.files) : []) as File[];
      for (const f of files) {
        if (String(f.type || '').toLowerCase().startsWith('image/')) {
          this.swalError('Imágenes no permitidas. Solo se permiten archivos PDF');
          continue;
        }
        const isPdf = f.type === 'application/pdf' && f.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          this.swalError('Solo se permiten archivos PDF');
          continue;
        }
      }
      // Agregar sin duplicar por nombre+tamaño
      for (const f of files) {
        if (String(f.type || '').toLowerCase().startsWith('image/')) continue;
        const isPdf = f.type === 'application/pdf' && f.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) continue;
        const existsSameName = this.reqOtros.some(o => o.nombre === f.name);
        if (existsSameName) {
          this.swalWarn('No puedes subir documentos con el mismo nombre');
          continue;
        }
        this.reqOtros.push({ file: f, nombre: f.name, tipo: '' });
      }
      // Limpiar legacy single state para 'otro'
      delete this.reqArchivos.otro;
      delete this.reqNombres.otro;
      // Permitir seleccionar nuevamente el mismo archivo en eventos futuros
      input.value = '';
    } else {
      const file = input.files && input.files[0];
      if (file) {
        if (String(file.type || '').toLowerCase().startsWith('image/')) {
          this.swalError('Imágenes no permitidas. Solo se permiten archivos PDF');
          input.value = '';
          return;
        }
        const isPdf = file.type === 'application/pdf' && file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          this.swalError('Solo se permiten archivos PDF');
          input.value = '';
          return;
        }
        const existingName = this.reqNombres[tipo];
        if (existingName && existingName === file.name) {
          this.swalWarn('No puedes subir documentos con el mismo nombre');
          input.value = '';
          return;
        }
        this.reqArchivos[tipo] = file;
        this.reqNombres[tipo] = file.name;
      } else {
        delete this.reqArchivos[tipo];
        delete this.reqNombres[tipo];
      }
    }
  }

  onReqDragOver(e: DragEvent, tipo: 'solicitud'|'oficio'|'otro') {
    e.preventDefault();
    if (!this.requisitosHabilitados) return;
    this.dragOverReq[tipo] = true;
  }

  onReqDragLeave(e: DragEvent, tipo: 'solicitud'|'oficio'|'otro') {
    e.preventDefault();
    this.dragOverReq[tipo] = false;
  }

  onReqDrop(e: DragEvent, tipo: 'solicitud'|'oficio'|'otro') {
    e.preventDefault();
    this.dragOverReq[tipo] = false;
    if (!this.requisitosHabilitados) {
      this.toast.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    if (!files.length) return;

    if (tipo === 'otro') {
      for (const f of files) {
        if (String(f.type || '').toLowerCase().startsWith('image/')) {
          this.swalError('Imágenes no permitidas. Solo se permiten archivos PDF');
          continue;
        }
        const isPdf = f.type === 'application/pdf' && f.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          this.swalError('Solo se permiten archivos PDF');
          continue;
        }
        const existsSameName = this.reqOtros.some(o => o.nombre === f.name);
        if (existsSameName) {
          this.swalWarn('No puedes subir documentos con el mismo nombre');
          continue;
        }
        this.reqOtros.push({ file: f, nombre: f.name, tipo: '' });
      }
      return;
    }

    const f = files[0];
    if (String(f?.type || '').toLowerCase().startsWith('image/')) {
      this.swalError('Imágenes no permitidas. Solo se permiten archivos PDF');
      return;
    }
    const isPdf = f.type === 'application/pdf' && f.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.swalError('Solo se permiten archivos PDF');
      return;
    }
    const existingName = this.reqNombres[tipo];
    if (existingName && existingName === f.name) {
      this.swalWarn('No puedes subir documentos con el mismo nombre');
      return;
    }
    this.reqArchivos[tipo] = f;
    this.reqNombres[tipo] = f.name;
  }

  removeOtro(index: number) {
    if (!this.requisitosHabilitados) {
      this.toast.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    this.reqOtros.splice(index, 1);
  }

  isOtroTipoDisabled(tipoLabel: string, currentIndex: number): boolean {
    const labelToCode = (t: string): string => {
      const key = String(t || '').toLowerCase();
      if (key.includes('vincul')) return 'cert_vinculacion';
      if (key.includes('prácticas') || key.includes('practicas')) return 'cert_practicas';
      if (key.includes('inglés') || key.includes('ingles')) return 'cert_ingles';
      if (key.includes('no adeud')) return 'cert_no_adeudar';
      if (key.includes('aprobación malla') || key.includes('aprobacion malla')) return 'cert_aprobacion_malla';
      return '';
    };

    const current = this.reqOtros[currentIndex];
    if (current && String(current.tipo || '') === String(tipoLabel || '')) return false;

    // 1) No repetir dentro de la selección actual
    const alreadySelected = this.reqOtros.some((o, idx) => idx !== currentIndex && String(o.tipo || '') === String(tipoLabel || ''));
    if (alreadySelected) return true;

    // 2) Si ya fue aprobado en checklist, bloquear para evitar resubidas
    const code = labelToCode(tipoLabel);
    if (!code) return false;
    const alreadyApproved = (this.docsList || []).some((d: any) =>
      String(d?.tipo || '').toLowerCase() === String(code).toLowerCase() &&
      String(d?.estado || '').toLowerCase() === 'aprobado'
    );
    return alreadyApproved;
  }

  submitRequisitos() {
    if (!this.requisitosHabilitados) {
      this.toast.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    // Validaciones
    const toUpload: Array<{ file: File; tipo: string }> = [];
    const mapOtroTipo = (t: string): string => {
      const key = (t || '').toLowerCase();
      if (key.includes('vincul')) return 'cert_vinculacion';
      if (key.includes('prácticas') || key.includes('practicas')) return 'cert_practicas';
      if (key.includes('inglés') || key.includes('ingles')) return 'cert_ingles';
      if (key.includes('no adeud')) return 'cert_no_adeudar';
      if (key.includes('aprobación malla') || key.includes('aprobacion malla')) return 'cert_aprobacion_malla';
      return 'solicitud';
    };

    if (this.reqArchivos.solicitud) {
      toUpload.push({ file: this.reqArchivos.solicitud, tipo: 'solicitud' });
    }
    if (this.reqArchivos.oficio) {
      toUpload.push({ file: this.reqArchivos.oficio, tipo: 'oficio' });
    }
    for (const o of this.reqOtros) {
      if (o.file && o.tipo) toUpload.push({ file: o.file, tipo: mapOtroTipo(o.tipo) });
    }

    // Verificar PDFs y tamaños
    for (const it of toUpload) {
      const isPdf = it.file.type === 'application/pdf' && it.file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) { this.toast.error('Solo se permiten archivos PDF'); return; }
      if (it.file.size > 20 * 1024 * 1024) { this.toast.error('Archivo excede 20MB'); return; }
    }

    // Subir secuencialmente
    this.loading = true;
    const doUpload = async () => {
      for (const it of toUpload) {
        const fd = new FormData();
        fd.append('file', it.file);
        fd.append('tipo', it.tipo);
        await new Promise<void>((resolve, reject) => {
          this.documents.upload(fd).subscribe({ next: () => resolve(), error: (err: any) => reject(err) });
        });
      }
    };

    doUpload()
      .then(() => {
        this.toast.success('Requisitos enviados a Secretaría');
        this.reqEstado = 'enviado';
        // Reset parcial de formulario
        this.reqArchivos = {};
        this.reqNombres = {} as any;
        this.reqOtros = [];
        this.loadChecklist();
      })
      .catch((err: any) => {
        const msg = err?.error?.message || err?.error?.error || err?.message || 'No se pudieron subir los documentos';
        this.swalError(String(msg));
      })
      .finally(() => { this.loading = false; });
  }

  // Helpers y acciones para checklist

  download(item: any) {
    const id = item?.id ?? item?.document_id;
    if (!id) return;
    this.documents.download(Number(id)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (item?.filename || item?.nombre || 'documento') + '';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('No se pudo descargar el documento')
    });
  }

  remove(item: any) {
    if (!this.canProceed) {
      this.toast.warning(this.validationsMsg || 'No puedes continuar aún.');
      return;
    }
    const id = item?.id ?? item?.document_id;
    if (!id) return;
    if (!confirm('¿Eliminar este documento?')) return;
    this.documents.remove(Number(id)).subscribe({
      next: () => {
        this.toast.success('Documento eliminado');
        this.docsList = this.docsList.filter(d => (d?.id ?? d?.document_id) !== id);
      },
      error: () => this.toast.error('No se pudo eliminar el documento')
    });
  }

  labelTipo(t: string) {
    switch (t) {
      case 'solicitud': return 'Solicitud';
      case 'oficio': return 'Oficio';
      case 'uic_final': return 'Informe final UIC';
      case 'uic_acta_tribunal': return 'Acta de Tribunal UIC';
      case 'cert_tesoreria': return 'Cert. Tesorería';
      case 'cert_secretaria': return 'Cert. Secretaría';
      case 'cert_vinculacion': return 'Cert. de vinculación';
      case 'cert_practicas': return 'Cert. de prácticas';
      case 'cert_ingles': return 'Cert. de inglés';
      case 'cert_no_adeudar': return 'Certificado de no adeudar';
      case 'cert_aprobacion_malla': return 'Certificado de aprobación malla';
      // Si por alguna razón aparecieran comprobantes (no debería en estudiante), se distinguen claramente
      case 'comprobante_certificados': return 'Comprobante de certificados';
      case 'comprobante_titulacion': return 'Comprobante de titulación';
      case 'comprobante_acta_grado': return 'Comprobante acta de grado';
      default: return 'Otro';
    }
  }

  labelEstado(s: string) {
    if (s === 'aprobado') return 'Aprobado';
    if (s === 'rechazado') return 'Rechazado';
    return 'En revisión';
  }
}
