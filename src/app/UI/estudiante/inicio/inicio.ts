import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../../services/notifications.service';
import { EnrollmentsService, EnrollmentCurrent, Modality } from '../../../services/enrollments.service';
import { StudentApiService } from '../../../services/student-api.service';
import { DocumentsService } from '../../../services/documents.service';
import { MeService } from '../../../services/me.service';

@Component({
  selector: 'app-est-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.scss']
})
export class Inicio {
  // Notificaciones (slide-over)
  isNotifOpen = false; // compat
  panelNotificacionesAbierto = false;
  notificaciones: Array<{ id: number; titulo: string; detalle: string; fecha: string; leida: boolean }> = [];
  get pendingCount() { return this.notificaciones.filter(n => !n.leida).length; }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotificaciones() { return this.onlyUnread ? this.notificaciones.filter(n => !n.leida) : this.notificaciones; }

  // Datos de tarjetas (documentos reales)
  documentosCount = 0;
  pagosEstado: 'pendiente' | 'enviado' | 'aprobado' | 'rechazado' = 'pendiente';
  modalidadEstado: 'sin_seleccionar' | 'en_proceso' | 'aprobada' = 'en_proceso';
  currentEnrollment: EnrollmentCurrent | null = null;
  get modalidadSeleccionadaLabel(): string {
    const mod = this.currentEnrollment?.modality as Modality | undefined;
    if (mod === 'UIC') return 'UIC';
    if (mod === 'EXAMEN_COMPLEXIVO') return 'Examen Complexivo';
    return 'Sin seleccionar';
  }
  get estadoMatriculaLabel(): string {
    const s = (this.currentEnrollment as any)?.status as string | undefined;
    if (!s) return 'Sin proceso';
    const map: Record<string, string> = {
      in_progress: 'En proceso',
      approved: 'Aprobada',
      pending: 'Pendiente',
      rejected: 'Rechazada',
      submitted: 'Enviado',
    };
    return map[s] || s.replace(/_/g, ' ').replace(/^(.)/, (c) => c.toUpperCase());
  }
  notasEstado: 'pendiente' | 'enviado' | 'aprobado' | 'rechazado' = 'pendiente';

  // Estado de documentos requeridos (se calcula desde backend)
  docEstados: Array<{ nombre: string; estado: 'aprobado'|'pendiente'|'rechazado' }>= [];

  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; this.isNotifOpen = this.panelNotificacionesAbierto; }

  marcarLeida(n: { id: number }) {
    this.notificationsSvc.markRead(n.id).subscribe({ complete: () => {
      const i = this.notificaciones.findIndex(x => x.id === n.id);
      if (i >= 0) this.notificaciones[i].leida = true;
    }});
  }

  marcarTodasLeidas() {
    this.notificationsSvc.markAllRead().subscribe({ complete: () => {
      this.notificaciones = this.notificaciones.map(n => ({ ...n, leida: true }));
    }});
  }

  constructor(
    private enroll: EnrollmentsService,
    private studentApi: StudentApiService,
    private docs: DocumentsService,
    private me: MeService,
    private notificationsSvc: NotificationsService,
  ) {}

  ngOnInit() {
    // Notificaciones
    this.notificationsSvc.listMy().subscribe((list: any[]) => {
      this.notificaciones = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        titulo: String((n as any).title || ''),
        detalle: String((n as any).message || ''),
        fecha: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });

    // Matrícula / modalidad actual (período activo)
    this.studentApi.getActivePeriodId$().subscribe((id) => {
      this.enroll.current(id || undefined).subscribe((res) => {
        this.currentEnrollment = (res as EnrollmentCurrent) || null;
      });
    });

    // Perfil -> calcular métricas
    this.me.getProfile().subscribe((profile) => {
      const id_user = profile?.user?.id_user;
      if (!id_user) return;

      const mapProcEstado = (estado: string | null | undefined): 'pendiente' | 'aprobado' | 'rechazado' => {
        const s = String(estado || '').toLowerCase();
        if (s === 'approved') return 'aprobado';
        if (s === 'rejected') return 'rechazado';
        return 'pendiente';
      };

      // Arancel (validación Tesorería) + Notas (validación Secretaría)
      const tesEstado = (profile as any)?.validations?.tesoreria_aranceles?.estado;
      const secEstado = (profile as any)?.validations?.secretaria_promedios?.estado;
      this.pagosEstado = mapProcEstado(tesEstado);
      this.notasEstado = mapProcEstado(secEstado);

      // 1) Documentos de matrícula (checklist) + estado por tipo
      this.docs.list({ category: 'matricula', page: 1, pageSize: 200 }).subscribe((resp: any) => {
        const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
        // total mostrado en card
        this.documentosCount = data.length;

        const norm = data.map((d: any) => ({
          tipo: String(d?.tipo ?? d?.document_type ?? d?.doc_type ?? '').toLowerCase(),
          estado: String(d?.estado ?? d?.status ?? 'en_revision').toLowerCase(),
          creado: new Date(d?.creado_en ?? d?.created_at ?? d?.createdAt ?? 0).getTime() || 0,
        }));

        const lastByTipo = new Map<string, { estado: string; creado: number }>();
        for (const it of norm) {
          if (!it.tipo) continue;
          const prev = lastByTipo.get(it.tipo);
          if (!prev || it.creado >= prev.creado) lastByTipo.set(it.tipo, { estado: it.estado, creado: it.creado });
        }

        const mapEstado = (e: string): 'aprobado'|'pendiente'|'rechazado' => {
          if (e === 'aprobado') return 'aprobado';
          if (e === 'rechazado') return 'rechazado';
          return 'pendiente';
        };

        const required: Array<{ key: string; nombre: string }> = [
          { key: 'solicitud', nombre: 'Solicitud' },
          { key: 'oficio', nombre: 'Oficio' },
          { key: 'cert_vinculacion', nombre: 'Cert. de vinculación' },
          { key: 'cert_practicas', nombre: 'Cert. de prácticas' },
          { key: 'cert_ingles', nombre: 'Cert. de inglés' },
        ];

        this.docEstados = required.map(r => {
          const st = lastByTipo.get(r.key)?.estado;
          return { nombre: r.nombre, estado: st ? mapEstado(st) : 'pendiente' };
        });
      });
    });
  }
}
