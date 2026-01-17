import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NotificationsService } from '../../../services/notifications.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Notificaciones
  notifications: Array<{ id: number; text: string; time: string; leida: boolean }> = [];
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotifications() { return this.onlyUnread ? this.notifications.filter(n => !n.leida) : this.notifications; }
  isNotifOpen = false;
  panelNotificacionesAbierto = false;
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

  // KPIs
  kpis = {
    elegibles: 0,
    calificacionesGuardadas: 0,
    calificacionesValidadas: 0,
    pendientesValidacion: 0,
    certificadosEmitidosHoy: 0,
  };

  // Actividad reciente
  recientes: Array<{ estudiante: string; tramite: string; fecha: string; estado: 'completado'|'pendiente' }>= [];

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient) {
    this.notificationsSvc.listMy().subscribe(list => {
      this.notifications = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        text: (n as any).title,
        time: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });

    this.http.get<any>('/api/english/dashboard').subscribe((d) => {
      this.kpis = {
        elegibles: Number(d?.elegibles || 0),
        calificacionesGuardadas: Number(d?.calificacionesGuardadas || 0),
        calificacionesValidadas: Number(d?.calificacionesValidadas || 0),
        pendientesValidacion: Number(d?.pendientesValidacion || 0),
        certificadosEmitidosHoy: Number(d?.certificadosEmitidosHoy || 0),
      };
    });
    this.http.get<Array<{ estudiante: string; tramite: string; fecha: string; estado: 'completado'|'pendiente' }>>('/api/english/recientes')
      .subscribe((rows) => {
        if (Array.isArray(rows)) this.recientes = rows.map(r => ({ ...r, fecha: new Date(r.fecha).toLocaleDateString() }));
      });
  }
}
