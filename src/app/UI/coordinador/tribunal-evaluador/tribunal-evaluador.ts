import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tribunal-evaluador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tribunal-evaluador.html',
  styleUrl: './tribunal-evaluador.scss'
})
export class TribunalEvaluador {
  // Opciones
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];
  carreraOptions: string[] = [
    'Desarrollo de Software', 'Electromecánica', 'Contabilidad', 'Marketing'
  ];
  roles: string[] = ['Integrante del Tribunal 1', 'Integrante del Tribunal 2', 'Integrante del Tribunal 3'];
  docentes: string[] = [
    'Ing. Ana Pérez', 'Ing. Luis Romero', 'Msc. María Vásquez', 'PhD. José Vera', 'Ing. Valeria Soto', 'Msc. Carlos Ruiz'
  ];

  // Estudiantes UIC con su tutor asignado (mock)
  estudiantesUIC: Array<{ id: number; nombre: string; tutor: string }> = [
    { id: 1, nombre: 'Juan Martínez', tutor: 'Ing. Ana Pérez' },
    { id: 2, nombre: 'Lucía Gómez', tutor: 'Msc. María Vásquez' },
    { id: 3, nombre: 'Carlos Ortiz', tutor: 'Ing. Luis Romero' },
  ];

  // Mock: IDs de estudiantes ya asignados a tribunal
  private asignados = new Set<number>();

  get estudiantesSinTribunal() {
    return this.estudiantesUIC.filter(e => !this.asignados.has(e.id));
  }

  model = {
    periodo: undefined as string | undefined,
    carrera: undefined as string | undefined,
    estudianteId: undefined as number | undefined,
    miembros: [] as Array<{ rol?: string; docente?: string }>
  };

  errors: string[] = [];

  addMiembro() {
    if (this.model.miembros.length >= 3) return;
    this.model.miembros.push({});
    this.onChange();
  }

  removeMiembro(i: number) {
    this.model.miembros.splice(i, 1);
    this.onChange();
  }

  onChange() {
    this.validate();
  }

  get selectedEstudiante() {
    return this.estudiantesUIC.find(e => e.id === this.model.estudianteId);
  }

  get selectedTutor(): string | undefined {
    return this.selectedEstudiante?.tutor;
  }

  private validate(): boolean {
    const errs: string[] = [];
    if (!this.model.periodo) errs.push('El período es requerido.');
    if (!this.model.carrera) errs.push('La carrera es requerida.');
    if (!this.model.estudianteId) errs.push('Debe seleccionar el estudiante (UIC).');
    if (this.model.miembros.length !== 3) errs.push('El tribunal debe tener exactamente 3 miembros.');
    const roles = new Set<string>();
    this.model.miembros.forEach((m, idx) => {
      if (!m.rol) errs.push(`Fila ${idx + 1}: El rol es requerido.`);
      if (!m.docente) errs.push(`Fila ${idx + 1}: El docente es requerido.`);
      if (m.rol) {
        const r = m.rol.trim().toLowerCase();
        if (roles.has(r)) errs.push(`El rol "${m.rol}" está duplicado.`);
        roles.add(r);
      }
      if (m.docente && this.selectedTutor && m.docente === this.selectedTutor) {
        errs.push(`Fila ${idx + 1}: El tutor (${this.selectedTutor}) no puede ser miembro del tribunal.`);
      }
    });
    this.errors = errs;
    return errs.length === 0;
  }

  guardar() {
    if (!this.validate()) return;
    // Mock persistencia: por ahora sólo mostramos en consola
    console.log('Tribunal evaluador guardado:', JSON.parse(JSON.stringify(this.model)));
    alert('Tribunal evaluador guardado (mock).');
    if (this.model.estudianteId) {
      this.asignados.add(this.model.estudianteId);
    }
    // Reset parcial del formulario para siguiente asignación
    this.model.estudianteId = undefined;
    this.model.miembros = [];
    this.errors = [];
  }
}
