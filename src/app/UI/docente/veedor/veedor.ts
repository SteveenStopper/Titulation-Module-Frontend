import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-veedor-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './veedor.html',
  styleUrl: './veedor.scss'
})
export class VeedorDocente {
  estudiantesAsignados: Array<{ id: string; nombre: string; carrera: string }> = [
    { id: 'v1', nombre: 'Ana Torres', carrera: 'Ingeniería en Sistemas' },
    { id: 'v2', nombre: 'Luis García', carrera: 'Ingeniería Civil' },
    { id: 'v3', nombre: 'Sofía Ramírez', carrera: 'Administración' },
  ];
}
