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
  // Notificaciones (slide-over)
  isNotifOpen = false; // compat
  panelNotificacionesAbierto = false;
  notifications = [
    { id: 1, text: '3 actas de grado pendientes de revisión', time: 'hace 25 min', leida: false },
    { id: 2, text: '2 solicitudes de certificado listas para entrega', time: 'hace 1 h', leida: false },
    { id: 3, text: 'Actualización de cronograma de titulación', time: 'ayer', leida: true },
  ];
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; this.isNotifOpen = this.panelNotificacionesAbierto; }
  marcarLeida(n: { id: number }) {
    const i = this.notifications.findIndex(x => x.id === n.id);
    if (i >= 0) this.notifications[i].leida = true;
  }
  marcarTodasLeidas() { this.notifications = this.notifications.map(n => ({ ...n, leida: true })); }

  // KPIs (mock)
  kpis = {
    actasPendientes: 3,
    certificadosEmitidosHoy: 5,
    matriculasProcesadas: 18,
    estudiantesAtendidos: 27,
    solicitudesEnCurso: 7,
  };

  // Trámites recientes (mock)
  recientes: Array<{ estudiante: string; tramite: string; fecha: string; estado: 'completado'|'pendiente' }>= [
    { estudiante: 'Ana Pérez', tramite: 'Emisión de certificado', fecha: '2025-10-07', estado: 'completado' },
    { estudiante: 'Luis Romero', tramite: 'Revisión acta de grado', fecha: '2025-10-07', estado: 'pendiente' },
    { estudiante: 'María Vásquez', tramite: 'Validación de matrícula', fecha: '2025-10-06', estado: 'completado' },
    { estudiante: 'Carlos Díaz', tramite: 'Entrega de acta', fecha: '2025-10-06', estado: 'pendiente' },
  ];
}
