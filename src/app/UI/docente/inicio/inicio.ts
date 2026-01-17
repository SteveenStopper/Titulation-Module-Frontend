import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationsService } from '../../../services/notifications.service';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-docente-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  resumen = [
    { titulo: 'Tutorías próximas', valor: 0, icono: 'fa-calendar-check', color: 'text-indigo-600' },
    { titulo: 'Revisiones pendientes', valor: 0, icono: 'fa-file-circle-check', color: 'text-amber-600' },
    { titulo: 'Materias a cargo', valor: 0, icono: 'fa-book', color: 'text-emerald-600' },
  ];

  accesos = [
    { titulo: 'Tutor UIC', ruta: '/docente/tutor-uic', icono: 'fa-users-rectangle', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { titulo: 'Docente Complexivo', ruta: '/docente/docente-complexivo', icono: 'fa-book-open-reader', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { titulo: 'Lector', ruta: '/docente/lector', icono: 'fa-file-lines', color: 'bg-sky-600 hover:bg-sky-700' },
    { titulo: 'Tribunal Evaluador', ruta: '/docente/tribunal-evaluador', icono: 'fa-gavel', color: 'bg-amber-600 hover:bg-amber-700' },
    { titulo: 'Veedor', ruta: '/docente/veedor', icono: 'fa-user-check', color: 'bg-rose-600 hover:bg-rose-700' },
  ];

  abrirNotificaciones() {
    this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto;
  }

  // Notificaciones
  panelNotificacionesAbierto = false;
  notificaciones: Array<{ id: number; titulo: string; detalle: string; fecha: string; leida: boolean }> = [];

  get noLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }
  // Mostrar solo no leídas por defecto
  onlyUnread = true;
  get visibleNotificaciones() { return this.onlyUnread ? this.notificaciones.filter(n => !n.leida) : this.notificaciones; }

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

  constructor(private notificationsSvc: NotificationsService, private http: HttpClient) {
    // Cargar KPIs reales del backend
    this.http.get<any>('/api/docente/dashboard')
      .pipe(catchError(() => of({ tutoriasProximas: 0, revisionesPendientes: 0, materiasACargo: 0 })))
      .subscribe((d) => {
        const tutoriasProximas = Number(d?.tutoriasProximas || 0);
        const revisionesPendientes = Number(d?.revisionesPendientes || 0);
        const materiasACargo = Number(d?.materiasACargo || 0);
        this.resumen = [
          { titulo: 'Tutorías próximas', valor: tutoriasProximas, icono: 'fa-calendar-check', color: 'text-indigo-600' },
          { titulo: 'Revisiones pendientes', valor: revisionesPendientes, icono: 'fa-file-circle-check', color: 'text-amber-600' },
          { titulo: 'Materias a cargo', valor: materiasACargo, icono: 'fa-book', color: 'text-emerald-600' },
        ];
      });
    // cargar notificaciones
    this.notificationsSvc.listMy().subscribe(list => {
      this.notificaciones = (list || []).map(n => ({
        id: Number((n as any).id_notification),
        titulo: (n as any).title,
        detalle: (n as any).message || '',
        fecha: new Date((n as any).created_at).toLocaleString(),
        leida: !!(n as any).is_read,
      }));
    });
  }
}
