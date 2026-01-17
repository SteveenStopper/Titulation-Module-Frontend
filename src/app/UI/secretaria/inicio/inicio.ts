import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../../services/notifications.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Notificaciones (slide-over)
  isNotifOpen = false; // compat
  panelNotificacionesAbierto = false;
  notifications: Array<{ id: number; text: string; time: string; leida: boolean }> = [];
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotifications() { return this.onlyUnread ? this.notifications.filter(n => !n.leida) : this.notifications; }
  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; this.isNotifOpen = this.panelNotificacionesAbierto; }
  marcarLeida(n: { id: number }) {
    this.notificationsSvc.markRead(n.id).subscribe({ complete: () => {
      const i = this.notifications.findIndex(x => x.id === n.id);
      if (i >= 0) this.notifications[i].leida = true;
    }});
  }
  marcarTodasLeidas() {
    this.notificationsSvc.markAllRead().subscribe({ complete: () => {
      this.notifications = this.notifications.map(n => ({ ...n, leida: true }));
    }});
  }

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient) {
    this.notificationsSvc.listMy().subscribe(list => {
      this.notifications = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        text: (n as any).title,
        time: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });
    // KPIs reales
    this.http.get<any>('/api/secretaria/dashboard').subscribe((d) => {
      this.kpis = {
        actasPendientes: Number(d?.actasPendientes || 0),
        certificadosEmitidosHoy: Number(d?.certificadosEmitidosHoy || 0),
        matriculasProcesadas: Number(d?.matriculasProcesadas || 0),
        estudiantesAtendidos: Number(d?.estudiantesAtendidos || 0),
        solicitudesEnCurso: Number(d?.solicitudesEnCurso || 0),
      };
    });
    // Trámites recientes reales
    this.http.get<Array<{ estudiante: string; tramite: string; fecha: string; estado: 'completado'|'pendiente' }>>('/api/secretaria/recientes').subscribe((rows) => {
      if (Array.isArray(rows)) this.recientes = rows.map(r => ({ ...r, fecha: new Date(r.fecha).toLocaleDateString() }));
    });
  }

  // KPIs iniciales (se actualizan desde backend)
  kpis = {
    actasPendientes: 0,
    certificadosEmitidosHoy: 0,
    matriculasProcesadas: 0,
    estudiantesAtendidos: 0,
    solicitudesEnCurso: 0,
  };

  // Trámites recientes (desde backend)
  recientes: Array<{ estudiante: string; tramite: string; fecha: string; estado: 'completado'|'pendiente' }>= [];
}
