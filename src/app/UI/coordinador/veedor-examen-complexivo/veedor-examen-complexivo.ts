import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-veedor-examen-complexivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './veedor-examen-complexivo.html',
  styleUrl: './veedor-examen-complexivo.scss'
})
export class VeedorExamenComplexivo {
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];
  carrerasDisponibles: string[] = [
    'Diseño de Modas', 'Ingeniería en Sistemas', 'Ingeniería Civil', 'Administración de Empresas', 'Arquitectura'
  ];
  veedores: string[] = [
    'Ing. Andrea Ruiz', 'Ing. Pedro Mena', 'Msc. Sofía León', 'Ing. David Torres', 'Ing. Paula Navas'
  ];

  model = {
    periodo: undefined as string | undefined,
    carreraFiltro: undefined as string | undefined,
    materias: [] as Array<{ nombre?: string; veedores: string[] }>
  };

  errors: string[] = [];

  addCarrera() {
    if (this.model.materias.length >= 4) return;
    this.model.materias.push({ veedores: [] });
    this.onChange();
  }

  removeCarrera(i: number) {
    this.model.materias.splice(i, 1);
    this.onChange();
  }

  toggleVeedor(i: number, nombre: string, checked: boolean) {
    const m = this.model.materias[i];
    if (!m) return;
    if (checked) {
      if (!m.veedores.includes(nombre)) m.veedores.push(nombre);
    } else {
      m.veedores = m.veedores.filter(v => v !== nombre);
    }
    this.onChange();
  }

  onChange() { this.validate(); }

  private validate(): boolean {
    const errs: string[] = [];
    if (!this.model.periodo) errs.push('El período es requerido.');
    if (this.model.materias.length === 0) errs.push('Agregue al menos una carrera.');
    if (this.model.materias.length > 4) errs.push('No puede asignar más de 4 carreras para el examen complexivo.');
    const nombres = new Set<string>();
    this.model.materias.forEach((m, idx) => {
      if (!m.nombre) errs.push(`Fila ${idx + 1}: La carrera es requerida.`);
      if (m.nombre) {
        const key = m.nombre.trim().toLowerCase();
        if (nombres.has(key)) errs.push(`La carrera "${m.nombre}" está duplicada.`);
        nombres.add(key);
      }
      if (!m.veedores || m.veedores.length === 0) errs.push(`Fila ${idx + 1}: Seleccione al menos un veedor.`);
    });
    this.errors = errs; return errs.length === 0;
  }

  guardar() {
    if (!this.validate()) return;
    console.log('Veedores examen complexivo guardado:', JSON.parse(JSON.stringify(this.model)));
    alert('Asignación de veedores guardada (mock).');
  }
}
