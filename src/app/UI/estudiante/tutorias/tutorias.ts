import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentCronogramaService, ComplexivoMateriaView } from '../../../services/student-cronograma.service';

@Component({
  selector: 'app-tutorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tutorias.html',
  styleUrl: './tutorias.scss'
})
export class Tutorias {
  materias: Array<{ codigo: string; nombre: string; docente: string | null; horario: string; aula: string; estado: string; proximaSesion: string; }> = [];

  constructor(private svc: StudentCronogramaService) {
    this.svc.getMyComplexivoMaterias().subscribe((rows: ComplexivoMateriaView[]) => {
      this.materias = rows.map(r => ({
        codigo: r.codigo,
        nombre: r.nombre,
        docente: r.docente,
        horario: '',
        aula: '',
        estado: 'En curso',
        proximaSesion: ''
      }));
    });
  }
}
