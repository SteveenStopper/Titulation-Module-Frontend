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
  // KPIs mock del período actual
  kpis = {
    recaudadoPeriodo: 12450.75,
    vouchersPendientes: 18,
    pagosHoy: 27,
    deudasVencidas: 9,
    arancelesActivos: 6,
  };

  // Notificaciones mock
  notifications = [
    { id: 1, text: '3 pagos pendientes de validación', time: 'hace 10 min', leida: false },
    { id: 2, text: 'Nuevo arancel “Matrícula 2026” creado', time: 'hace 2 h', leida: false },
  ];
  get notificationsCount() { return this.notifications.length; }
  notificationsOpen = false;
  toggleNotifications() { this.notificationsOpen = !this.notificationsOpen; }

  // Slide-over estilo Docente
  panelNotificacionesAbierto = false;
  get pendingCount() { return this.notifications.filter(n => !n.leida).length; }
  get isNotifOpen() { return this.panelNotificacionesAbierto; }
  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; }
  marcarLeida(n: { id: number }) {
    const i = this.notifications.findIndex(x => x.id === n.id);
    if (i >= 0) this.notifications[i].leida = true;
  }
  marcarTodasLeidas() {
    this.notifications = this.notifications.map(n => ({ ...n, leida: true }));
  }

  // Pagos recientes mock
  recentPayments: Array<{ estudiante: string; concepto: string; monto: number; fecha: string; estado: 'aprobado' | 'pendiente' }>
    = [
      { estudiante: 'Ana Pérez', concepto: 'Matrícula', monto: 120.00, fecha: '2025-10-06', estado: 'aprobado' },
      { estudiante: 'Luis Romero', concepto: 'Derechos UIC', monto: 80.00, fecha: '2025-10-06', estado: 'pendiente' },
      { estudiante: 'María Vásquez', concepto: 'Examen Complexivo', monto: 100.00, fecha: '2025-10-05', estado: 'aprobado' },
    ];
}
