import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tutorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorias.html',
  styleUrl: './tutorias.scss'
})
export class Tutorias {
  // Demo: materias asignadas al estudiante (hasta conectar backend)
  materias = [
    {
      codigo: 'EC-101',
      nombre: 'Lenguaje y Comunicación',
      docente: 'Lcda. Andrea López',
      horario: 'Lunes y Miércoles 08:00 - 10:00',
      aula: 'Aula 204',
      estado: 'En curso',
      proximaSesion: '2025-10-22T08:00:00'
    },
    {
      codigo: 'EC-205',
      nombre: 'Matemática Aplicada',
      docente: 'Ing. Diego Pérez',
      horario: 'Martes y Jueves 10:00 - 12:00',
      aula: 'Laboratorio 1',
      estado: 'En curso',
      proximaSesion: '2025-10-23T10:00:00'
    },
    {
      codigo: 'EC-310',
      nombre: 'Proyecto Integrador',
      docente: 'Msc. Carla Medina',
      horario: 'Viernes 14:00 - 17:00',
      aula: 'Sala de Proyectos',
      estado: 'Pendiente',
      proximaSesion: ''
    }
  ];
}
