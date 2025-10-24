import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Datos mock de panel (pueden venir de un servicio más adelante)
  resumen = [
    { titulo: 'Carreras activas', valor: 3, icono: 'fa-school', color: 'text-indigo-600' },
    { titulo: 'Materias registradas', valor: 7, icono: 'fa-book', color: 'text-emerald-600' },
    { titulo: 'Pendientes de publicar', valor: 2, icono: 'fa-bullhorn', color: 'text-amber-600' },
    { titulo: 'Tutores disponibles', valor: 12, icono: 'fa-user-tie', color: 'text-sky-600' },
  ];

  accesos = [
    { titulo: 'Gestión Examen Complexivo', ruta: '/vicerrector/gestion-examenes', icono: 'fa-file-pen', color: 'bg-indigo-600 hover:bg-indigo-700' },
    { titulo: 'Reportes', ruta: '/vicerrector/reportes', icono: 'fa-chart-column', color: 'bg-emerald-600 hover:bg-emerald-700' },
  ];
}
