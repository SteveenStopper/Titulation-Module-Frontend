import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  // Resumen general (mock)
  resumen = [
    { titulo: 'Total carreras', valor: 3, icono: 'fa-school', color: 'text-indigo-600' },
    { titulo: 'Materias registradas', valor: 9, icono: 'fa-book', color: 'text-emerald-600' },
    { titulo: 'Tutores asignados', valor: 8, icono: 'fa-user-tie', color: 'text-sky-600' },
    { titulo: 'Pendientes de publicar', valor: 3, icono: 'fa-bullhorn', color: 'text-amber-600' },
  ];

  // Distribución por carrera (mock)
  distribucionCarreras: Array<{ carrera: string; registradas: number; publicadas: number }> = [
    { carrera: 'Desarrollo de Software', registradas: 4, publicadas: 3 },
    { carrera: 'Electromecánica', registradas: 3, publicadas: 2 },
    { carrera: 'Contabilidad', registradas: 2, publicadas: 1 },
  ];

  // Top tutores por cantidad de materias asignadas (mock)
  topTutores: Array<{ tutor: string; asignadas: number }> = [
    { tutor: 'Ing. Ana Pérez', asignadas: 3 },
    { tutor: 'Ing. Luis Romero', asignadas: 3 },
    { tutor: 'Msc. María Vásquez', asignadas: 2 },
    { tutor: 'PhD. José Vera', asignadas: 1 },
  ];

  totalReg(): number {
    return this.distribucionCarreras.reduce((acc, c) => acc + c.registradas, 0);
  }

  pctPublicado(c: { registradas: number; publicadas: number }): number {
    if (!c.registradas) return 0;
    return Math.round((c.publicadas / c.registradas) * 100);
  }
}
