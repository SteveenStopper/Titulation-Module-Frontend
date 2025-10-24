import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nota-estudiantes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nota-estudiantes.html',
  styleUrl: './nota-estudiantes.scss'
})
export class NotaEstudiantes {
  // Configuración
  minNota = 7; // Nota mínima requerida por semestre (escala 0 - 10)

  // Cantidad de semestres por carrera (4 o 5)
  semestresPorCarrera: Record<string, number> = {
    'Sistemas': 5,
    'Electromecánica': 5,
    'Contabilidad': 4,
  };

  // Búsqueda simple
  search = '';
  // Filtro por carrera
  carreraFiltro = '';

  // Lista de carreras (únicas) derivada de los datos
  get carreras(): string[] {
    return Array.from(new Set(this.estudiantes.map(e => e.carrera)));
  }

  // Datos mock: calificaciones por semestre (1..5). null = sin nota. Escala 0-10
  estudiantes: Array<{
    id: number;
    nombre: string;
    carrera: string;
    s1: number | null; s2: number | null; s3: number | null;
    s4: number | null; s5: number | null;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
  }> = [
    { id: 1, nombre: 'Ana Pérez', carrera: 'Sistemas', s1: 8.2, s2: 7.7, s3: 9.0, s4: 8.5, s5: 8.8, estado: 'pendiente' },
    { id: 2, nombre: 'Luis Romero', carrera: 'Electromecánica', s1: 6.9, s2: 7.5, s3: 8.0, s4: 8.3, s5: 7.9, estado: 'pendiente' },
    { id: 3, nombre: 'María Vásquez', carrera: 'Contabilidad', s1: 7.0, s2: 7.2, s3: null, s4: 8.1, s5: null, estado: 'pendiente' },
  ];

  // Lista filtrada
  get filtered() {
    const q = this.search.trim().toLowerCase();
    return this.estudiantes.filter(e =>
      (!this.carreraFiltro || e.carrera === this.carreraFiltro) &&
      (!q || e.nombre.toLowerCase().includes(q))
    );
  }

  private semestresDe(e: any): number {
    return this.semestresPorCarrera[e.carrera] || 4;
  }

  private valoresDe(e: any): Array<number | null> {
    const n = this.semestresDe(e);
    const arr = [e.s1, e.s2, e.s3, e.s4, e.s5];
    return arr.slice(0, n);
  }

  promedio(e: any) {
    const vals = this.valoresDe(e).filter((v: number | null) => typeof v === 'number') as number[];
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  }

  sinNotas(e: any) {
    return this.valoresDe(e).some((v: number | null) => v === null || v === undefined);
  }

  tieneBajas(e: any) {
    return this.valoresDe(e).some((v: number | null) => typeof v === 'number' && v < this.minNota);
  }

  elegible(e: any) {
    return !this.sinNotas(e) && !this.tieneBajas(e);
  }

  aceptar(id: number) {
    const e = this.estudiantes.find(x => x.id === id);
    if (!e) return;
    if (!this.elegible(e)) return; // seguridad extra
    e.estado = 'aprobado';
  }

  rechazar(id: number) {
    const e = this.estudiantes.find(x => x.id === id);
    if (!e) return;
    e.estado = 'rechazado';
  }

  generarCertificado(id: number) {
    const e = this.estudiantes.find(x => x.id === id);
    if (!e) return;
    if (e.estado !== 'aprobado') return;
    console.log('Generar certificado de notas para', e.nombre, ' - Carrera:', e.carrera);
    // TODO: integrar con backend: POST /api/secretaria/certificados/notas { userId, academicPeriodId }
  }
}
