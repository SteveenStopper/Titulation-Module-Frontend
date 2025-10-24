import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Métricas (demo hasta conectar backend)
  totalEnProceso = 0;
  sinTutor = 0;
  totalEstudiantes = 0;

  // Distribución por modalidad (porcentajes 0-100)
  uicPercent = 0;
  complexivoPercent = 0;

  // Notificaciones (slide-over)
  notifications: Array<{ id: number; text: string; time: string; leida: boolean }> = [
    { id: 1, text: '2 solicitudes sin tutor asignado', time: 'hace 12 min', leida: false },
    { id: 2, text: 'Nuevo reporte disponible', time: 'hace 1 h', leida: false },
    { id: 3, text: 'Recordatorio de reunión', time: 'ayer', leida: true },
  ];
  get notificationsCount() { return this.notifications.length; }
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  isNotifOpen = false; // compat
  panelNotificacionesAbierto = false;
  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; this.isNotifOpen = this.panelNotificacionesAbierto; }
  marcarLeida(n: { id: number }) {
    const i = this.notifications.findIndex(x => x.id === n.id);
    if (i >= 0) this.notifications[i].leida = true;
  }
  marcarTodasLeidas() { this.notifications = this.notifications.map(n => ({ ...n, leida: true })); }

  constructor() {
    // Valores de ejemplo para visualización; reemplazar con datos reales desde servicio
    this.totalEnProceso = 34;
    this.sinTutor = 5;
    this.totalEstudiantes = 120;

    // Distribución (suma 100)
    this.uicPercent = 65;
    this.complexivoPercent = 35;
  }
}
