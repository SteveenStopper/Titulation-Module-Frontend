import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tribunal-evaluador-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tribunal-evaluador.html',
  styleUrl: './tribunal-evaluador.scss'
})
export class TribunalEvaluadorDocente {
  estudiantesAsignados: Array<{ id: string; nombre: string; carrera: string }> = [
    { id: 't1', nombre: 'Ana Torres', carrera: 'Ingeniería en Sistemas' },
    { id: 't2', nombre: 'Luis García', carrera: 'Ingeniería Civil' },
    { id: 't3', nombre: 'Sofía Ramírez', carrera: 'Administración' },
  ];
}
