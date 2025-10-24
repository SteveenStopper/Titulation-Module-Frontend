import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-actas-grado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actas-grado.html',
  styleUrl: './actas-grado.scss'
})
export class ActasGrado {
  items: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    tribunal: string;
    calificacionTribunal: number | null;
    hojaGenerada: boolean;
    hojaCargada: boolean;
    guardado: boolean;
  }> = [
    { id: 1, estudiante: 'Ana Pérez', carrera: 'Sistemas', tribunal: 'Tribunal A', calificacionTribunal: null, hojaGenerada: false, hojaCargada: false, guardado: false },
    { id: 2, estudiante: 'Luis Romero', carrera: 'Electromecánica', tribunal: 'Tribunal B', calificacionTribunal: null, hojaGenerada: false, hojaCargada: false, guardado: false },
    { id: 3, estudiante: 'María Vásquez', carrera: 'Contabilidad', tribunal: 'Tribunal C', calificacionTribunal: null, hojaGenerada: false, hojaCargada: false, guardado: false },
  ];

  isCalificacionValida(it: { calificacionTribunal: number | null }): boolean {
    return typeof it.calificacionTribunal === 'number' && it.calificacionTribunal >= 0 && it.calificacionTribunal <= 10;
  }

  generarHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    it.hojaGenerada = true;
  }

  cargarHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isCalificacionValida(it)) return;
    it.hojaCargada = true;
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isCalificacionValida(it)) return;
    it.guardado = true;
  }
}
