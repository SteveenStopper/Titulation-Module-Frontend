import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inicio.html',
  styleUrls: ['./inicio.scss']
})
export class Inicio {
  // Notificaciones (slide-over)
  isNotifOpen = false; // compat
  panelNotificacionesAbierto = false;
  notificaciones: Array<{ id: number; titulo: string; detalle: string; fecha: string; leida: boolean }> = [
    { id: 1, titulo: 'Observación nueva', detalle: 'Secretaría agregó una observación a tu trámite', fecha: 'Hoy 10:12', leida: false },
    { id: 2, titulo: 'Pago aprobado', detalle: 'Tesorería validó tu pago de matrícula', fecha: 'Ayer 16:40', leida: true },
    { id: 3, titulo: 'Cronograma actualizado', detalle: 'Nueva fecha en cronograma UIC', fecha: 'Ayer 09:05', leida: false },
  ];
  get pendingCount() { return this.notificaciones.filter(n => !n.leida).length; }

  // Datos de tarjetas (demo)
  documentos = [{}, {}, {}];
  pagosEstado: 'pendiente' | 'enviado' | 'aprobado' | 'rechazado' = 'pendiente';
  modalidadEstado: 'sin_seleccionar' | 'en_proceso' | 'aprobada' = 'en_proceso';
  notasEstado: 'pendiente' | 'enviado' | 'aprobado' | 'rechazado' = 'pendiente';

  // Estado de documentos requeridos
  docEstados: Array<{ nombre: string; estado: 'aprobado'|'pendiente'|'rechazado' }>= [
    { nombre: 'Solicitud', estado: 'pendiente' },
    { nombre: 'Oficio', estado: 'aprobado' },
    { nombre: 'Otro documento', estado: 'rechazado' }
  ];

  toggleNotif() { this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto; this.isNotifOpen = this.panelNotificacionesAbierto; }

  marcarLeida(n: { id: number }) {
    const i = this.notificaciones.findIndex(x => x.id === n.id);
    if (i >= 0) this.notificaciones[i].leida = true;
  }

  marcarTodasLeidas() {
    this.notificaciones = this.notificaciones.map(n => ({ ...n, leida: true }));
  }
}
