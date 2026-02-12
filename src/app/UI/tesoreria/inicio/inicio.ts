import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../../services/notifications.service';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // KPIs iniciales (se actualizan desde backend)
  kpis = {
    recaudadoPeriodo: 0,
    vouchersPendientes: 0,
    pagosHoy: 0,
  };

  // Notificaciones
  notifications: Array<{ id: number; text: string; time: string; leida: boolean }> = [];
  get notificationsCount() { return this.notifications.length; }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotifications() { return this.onlyUnread ? this.notifications.filter(n => !n.leida) : this.notifications; }
  notificationsOpen = false;
  toggleNotifications() { this.notificationsOpen = !this.notificationsOpen; }

  // Slide-over estilo Docente
  panelNotificacionesAbierto = false;
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  get isNotifOpen() { return this.panelNotificacionesAbierto; }
  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; }
  marcarLeida(n: { id: number }) {
    this.notificationsSvc.markRead(n.id).subscribe({
      complete: () => {
        const i = this.notifications.findIndex(x => x.id === n.id);
        if (i >= 0) this.notifications[i].leida = true;
      }
    });
  }
  marcarTodasLeidas() {
    this.notificationsSvc.markAllRead().subscribe({
      complete: () => {
        this.notifications = this.notifications.map(n => ({ ...n, leida: true }));
      }
    });
  }

  private destroyed$ = new Subject<void>();

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient, private periodSvc: PeriodService) {
    this.notificationsSvc.listMy().subscribe(list => {
      this.notifications = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        text: (n as any).title,
        time: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });

    this.loadData();

    this.periodSvc.activePeriod$
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.resetView();
        this.loadData();
      });
  }

  private resetView() {
    this.kpis = {
      recaudadoPeriodo: 0,
      vouchersPendientes: 0,
      pagosHoy: 0,
    };
    this.recentPayments = [];
  }

  private loadData() {
    // KPIs reales
    this.http.get<any>('/api/tesoreria/dashboard').subscribe((d) => {
      this.kpis = {
        recaudadoPeriodo: Number(d?.recaudadoPeriodo || 0),
        vouchersPendientes: Number(d?.vouchersPendientes || 0),
        pagosHoy: Number(d?.pagosHoy || 0),
      };
    });
    // Pagos recientes: últimos comprobantes (vouchers) subidos
    this.http.get<any>('/api/vouchers?v_type=pago_certificado&page=1&pageSize=5').subscribe((resp) => {
      const data = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
      this.recentPayments = data.map((r: any) => {
        const estudiante = r?.users ? `${String(r.users.firstname || '').trim()} ${String(r.users.lastname || '').trim()}`.trim() : (String(r?.estudiante || '').trim() || `ID ${r?.id_user || ''}`);
        const monto = Number(r?.amount ?? r?.monto ?? 0);
        const fecha = new Date(r?.created_at || r?.creado_en || Date.now()).toLocaleDateString();
        const estadoRaw = String(r?.status || r?.estado || '').toLowerCase();
        const estado = (estadoRaw === 'aprobado' || estadoRaw === 'rechazado' || estadoRaw === 'en_revision')
          ? (estadoRaw as 'aprobado' | 'rechazado' | 'en_revision')
          : 'en_revision';
        return {
          estudiante,
          concepto: 'Pago',
          monto,
          fecha,
          estado,
        };
      });
    });
  }

  ngOnDestroy() {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  // Pagos recientes
  recentPayments: Array<{ estudiante: string; concepto: string; monto: number; fecha: string; estado: 'aprobado' | 'rechazado' | 'en_revision' }> = [];
}
