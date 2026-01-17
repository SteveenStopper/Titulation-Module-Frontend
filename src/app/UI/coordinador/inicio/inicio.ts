import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../../services/notifications.service';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Métricas
  totalEnProceso = 0;
  sinTutor = 0;
  totalEstudiantes = 0;

  // Distribución por modalidad (porcentajes 0-100)
  uicPercent = 0;
  complexivoPercent = 0;

  // Notificaciones (slide-over)
  notifications: Array<{ id: number; text: string; time: string; leida: boolean }> = [];
  get notificationsCount() { return this.notifications.length; }
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotifications() { return this.onlyUnread ? this.notifications.filter(n => !n.leida) : this.notifications; }
  isNotifOpen = false; // compat
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

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient) {
    // Cargar métricas reales del backend (período activo)
    this.http.get<any>('/api/uic/admin/dashboard')
      .pipe(catchError(() => of({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 })))
      .subscribe((d) => {
        this.totalEnProceso = Number(d?.totalEnProceso || 0);
        this.sinTutor = Number(d?.sinTutor || 0);
        this.totalEstudiantes = Number(d?.totalEstudiantes || 0);
        this.uicPercent = Number(d?.uicPercent || 0);
        this.complexivoPercent = Number(d?.complexivoPercent || 0);
      });

    // cargar notificaciones
    this.notificationsSvc.listMy().subscribe(list => {
      this.notifications = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        text: (n as any).title,
        time: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });
  }
}
