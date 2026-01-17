import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { TesoreriaService, TesoreriaResumenItem } from '../../../services/tesoreria.service';
import { saveBlobToFile } from '../../../core/download.util';
import { NotificationsService } from '../../../services/notifications.service';
import { DialogModule } from 'primeng/dialog';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-aranceles',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule],
  templateUrl: './aranceles.html',
  styleUrl: './aranceles.scss'
})
export class Aranceles {
  // Filtros y estado
  search = '';
  periodoId: number | null = null; // se carga automáticamente (período activo)
  loading = false;
  page = 1;
  pageSize = 20;

  // Datos desde el backend
  items: TesoreriaResumenItem[] = [];

  // Modal rechazo
  showRejectDialog = false;
  rejectObs = '';
  rejectTargetId: number | null = null;

  constructor(
    private tesoreria: TesoreriaService,
    private toast: ToastrService,
    private notifications: NotificationsService,
    private http: HttpClient,
  ) {
    this.loadPeriodoActivo();
    this.loadResumen();
  }

  private loadPeriodoActivo() {
    this.http.get<any>('/api/settings/active-period').subscribe({
      next: (p) => {
        const id = Number(p?.id_academic_periods);
        this.periodoId = Number.isFinite(id) ? id : null;
      },
      error: () => {
        this.periodoId = null;
      }
    });
  }

  // Lista filtrada por texto
  get filtered() {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(it =>
      (it.nombre || '').toLowerCase().includes(q) ||
      (it.carrera_nombre || '').toLowerCase().includes(q)
    );
  }

  estadoLabel(it: TesoreriaResumenItem): 'Activo' | 'Inactivo' {
    return (it.estado_aranceles || '').toLowerCase() === 'activo' ? 'Activo' : 'Inactivo';
  }

  validacionLabel(it: TesoreriaResumenItem): 'Activo' | 'Inactivo' {
    const st = it.validacion_estado || 'pending';
    if (st === 'approved') return 'Activo';
    return 'Inactivo';
  }

  canApproveOrReject(it: TesoreriaResumenItem): boolean {
    return (it.validacion_estado || 'pending') === 'pending';
  }

  canReconsider(it: TesoreriaResumenItem): boolean {
    return (it.validacion_estado || 'pending') === 'rejected';
  }

  canGenerate(it: TesoreriaResumenItem): boolean {
    return (it.validacion_estado || 'pending') === 'approved' && !it.certificado_doc_id;
  }

  canView(it: TesoreriaResumenItem): boolean {
    return (it.validacion_estado || 'pending') === 'approved' && !!it.certificado_doc_id;
  }

  loadResumen() {
    this.loading = true;
    this.tesoreria.getResumen(this.page, this.pageSize)
      .subscribe({
        next: (resp) => {
          this.items = resp?.data || [];
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.message || 'No se pudo cargar el resumen');
        }
      });
  }

  private requirePeriodo(): number | null {
    if (!this.periodoId || !Number.isFinite(this.periodoId)) {
      this.toast.warning('Selecciona el período académico');
      return null;
    }
    return Number(this.periodoId);
  }

  aprobar(it: TesoreriaResumenItem) {
    const periodo = this.requirePeriodo();
    if (periodo === null) return;
    if (!this.canApproveOrReject(it)) return;
    this.loading = true;
    this.tesoreria.aprobar(periodo, Number(it.estudiante_id))
      .subscribe({
        next: () => { this.toast.success('Aprobado'); this.loading = false; this.loadResumen(); },
        error: (err) => { this.loading = false; this.toast.error(err?.error?.message || 'No se pudo aprobar'); }
      });
  }

  rechazar(it: TesoreriaResumenItem) {
    this.rejectTargetId = Number(it.estudiante_id);
    this.rejectObs = '';
    this.showRejectDialog = true;
  }

  confirmReject() {
    const periodo = this.requirePeriodo();
    if (periodo === null) return;
    if (!this.rejectTargetId) return;
    const obs = (this.rejectObs || '').trim();
    if (!obs) { this.toast.warning('La observación es obligatoria'); return; }
    this.loading = true;
    const estudiante_id = this.rejectTargetId;
    this.tesoreria.rechazar(periodo, estudiante_id, obs)
      .subscribe({
        next: () => {
          this.notifications.create({
            id_user: estudiante_id,
            type: 'tesoreria_rechazo',
            title: 'Tesorería: Solicitud rechazada',
            message: obs,
            entity_type: 'tesoreria',
            entity_id: estudiante_id,
          }).subscribe({ complete: () => {} });
          this.toast.info('Rechazado y notificado');
          this.loading = false;
          this.showRejectDialog = false;
          this.rejectTargetId = null;
          this.rejectObs = '';
          this.loadResumen();
        },
        error: (err) => { this.loading = false; this.toast.error(err?.error?.message || 'No se pudo rechazar'); }
      });
  }

  reconsiderar(it: TesoreriaResumenItem) {
    const periodo = this.requirePeriodo();
    if (periodo === null) return;
    if (!this.canReconsider(it)) return;
    this.loading = true;
    this.tesoreria.reconsiderar(periodo, Number(it.estudiante_id))
      .subscribe({
        next: () => { this.toast.success('Reconsiderado'); this.loading = false; this.loadResumen(); },
        error: (err) => { this.loading = false; this.toast.error(err?.error?.message || 'No se pudo reconsiderar'); }
      });
  }

  cancelReject() {
    this.showRejectDialog = false;
    this.rejectTargetId = null;
    this.rejectObs = '';
  }

  generarCertificado(it: TesoreriaResumenItem) {
    const periodo = this.requirePeriodo();
    if (periodo === null) return;
    if (!this.canGenerate(it)) return;
    this.loading = true;
    this.tesoreria.generarCertificado(periodo, Number(it.estudiante_id))
      .subscribe({
        next: () => { this.toast.success('Certificado generado'); this.loading = false; this.loadResumen(); },
        error: (err) => { this.loading = false; this.toast.error(err?.error?.message || 'No se pudo generar'); }
      });
  }

  descargarCertificado(it: TesoreriaResumenItem) {
    const periodo = this.requirePeriodo();
    if (periodo === null) return;
    if (!this.canView(it)) return;
    this.loading = true;
    this.tesoreria.descargarCertificadoPorEstudiante(Number(it.estudiante_id), periodo)
      .subscribe({
        next: (blob) => {
          saveBlobToFile(blob, `cert_tesoreria_${it.estudiante_id}.pdf`);
          this.loading = false;
        },
        error: (err) => { this.loading = false; this.toast.error(err?.error?.message || 'No se pudo descargar'); }
      });
  }
}
