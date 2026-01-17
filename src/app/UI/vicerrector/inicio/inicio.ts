import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../../services/notifications.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Datos iniciales
  resumen = [
    { titulo: 'Carreras activas', valor: 0, icono: 'fa-school', color: 'text-indigo-600' },
    { titulo: 'Materias registradas', valor: 0, icono: 'fa-book', color: 'text-emerald-600' },
    { titulo: 'Pendientes de publicar', valor: 0, icono: 'fa-bullhorn', color: 'text-amber-600' },
    { titulo: 'Tutores disponibles', valor: 0, icono: 'fa-user-tie', color: 'text-sky-600' },
  ];

  accesos = [
    { titulo: 'Gestión Examen Complexivo', ruta: '/vicerrector/gestion-examenes', icono: 'fa-file-pen', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { titulo: 'Reportes', ruta: '/vicerrector/reportes', icono: 'fa-chart-column', color: 'bg-emerald-600 hover:bg-emerald-700' },
  ];

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

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient) {
    // KPIs reales
    this.http.get<any>('/api/vicerrector/dashboard').subscribe((d) => {
      this.resumen = [
        { titulo: 'Carreras activas', valor: Number(d?.carrerasActivas || 0), icono: 'fa-school', color: 'text-indigo-600' },
        { titulo: 'Materias registradas', valor: Number(d?.materiasRegistradas || 0), icono: 'fa-book', color: 'text-emerald-600' },
        { titulo: 'Pendientes de publicar', valor: Number(d?.pendientesPublicar || 0), icono: 'fa-bullhorn', color: 'text-amber-600' },
        { titulo: 'Tutores disponibles', valor: Number(d?.tutoresDisponibles || 0), icono: 'fa-user-tie', color: 'text-sky-600' },
      ];
    });
    // cargar notificaciones reales
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
