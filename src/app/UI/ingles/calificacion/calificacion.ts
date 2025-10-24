import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-calificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificacion.html',
  styleUrl: './calificacion.scss'
})
export class Calificacion {
  items: Array<{ id: number; estudiante: string; carrera: string; nota: number | null; guardado: boolean }>= [
    { id: 1, estudiante: 'Ana Pérez', carrera: 'Sistemas', nota: null, guardado: false },
    { id: 2, estudiante: 'Luis Romero', carrera: 'Electromecánica', nota: null, guardado: false },
    { id: 3, estudiante: 'María Vásquez', carrera: 'Contabilidad', nota: null, guardado: false },
  ];

  isNotaLista(it: { nota: number | null }): boolean {
    return typeof it.nota === 'number';
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isNotaLista(it)) return;
    it.guardado = true;
  }

  generarCertificado(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    console.log('Generar certificado de inglés para', it.estudiante);
  }
}
