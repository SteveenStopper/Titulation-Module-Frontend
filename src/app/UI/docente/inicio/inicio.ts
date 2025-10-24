import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-docente-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // KPIs mock (conectar a servicio luego)
  resumen = [
    { titulo: 'Tutorías próximas', valor: 3, icono: 'fa-calendar-check', color: 'text-indigo-600' },
    { titulo: 'Revisiones pendientes', valor: 2, icono: 'fa-file-circle-check', color: 'text-amber-600' },
    { titulo: 'Materias a cargo', valor: 2, icono: 'fa-book', color: 'text-emerald-600' },
  ];

  accesos = [
    { titulo: 'Tutor UIC', ruta: '/docente/tutor-uic', icono: 'fa-users-rectangle', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { titulo: 'Docente Complexivo', ruta: '/docente/docente-complexivo', icono: 'fa-book-open-reader', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { titulo: 'Lector', ruta: '/docente/lector', icono: 'fa-file-lines', color: 'bg-sky-600 hover:bg-sky-700' },
  ];

  abrirNotificaciones() {
    this.panelNotificacionesAbierto = !this.panelNotificacionesAbierto;
  }

  // Notificaciones (mock)
  panelNotificacionesAbierto = false;
  notificaciones: Array<{ id: number; titulo: string; detalle: string; fecha: string; leida: boolean }> = [
    { id: 1, titulo: 'Nueva tutoría asignada', detalle: 'Estudiante: Juan Pérez, mañana 09:00', fecha: 'Hoy 08:15', leida: false },
    { id: 2, titulo: 'Documento para revisión', detalle: 'Trabajo de grado de M. Vásquez', fecha: 'Ayer 17:22', leida: false },
    { id: 3, titulo: 'Cambio de aula', detalle: 'Defensa moved to A-204', fecha: 'Ayer 10:05', leida: true },
  ];

  get noLeidas(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  marcarLeida(n: { id: number }) {
    const i = this.notificaciones.findIndex(x => x.id === n.id);
    if (i >= 0) this.notificaciones[i].leida = true;
  }

  marcarTodasLeidas() {
    this.notificaciones = this.notificaciones.map(n => ({ ...n, leida: true }));
  }
}
