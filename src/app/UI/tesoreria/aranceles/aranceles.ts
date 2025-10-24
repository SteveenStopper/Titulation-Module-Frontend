import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aranceles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aranceles.html',
  styleUrl: './aranceles.scss'
})
export class Aranceles {
  // Búsqueda rápida
  search = '';

  // Mock de aranceles por estudiante
  items: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    aranceles: Array<{ concepto: string; monto: number; estado: 'pendiente' | 'aprobado' | 'rechazado' }>;
    clearanceStatus: 'pending' | 'approved' | 'rejected';
  }> = [
    {
      id: 1,
      estudiante: 'Ana Pérez',
      carrera: 'Tecnología en Sistemas',
      aranceles: [
        { concepto: 'Matrícula', monto: 120, estado: 'aprobado' },
        { concepto: 'Derechos UIC', monto: 80, estado: 'pendiente' },
      ],
      clearanceStatus: 'pending',
    },
    {
      id: 2,
      estudiante: 'Luis Romero',
      carrera: 'Electromecánica',
      aranceles: [
        { concepto: 'Matrícula', monto: 120, estado: 'aprobado' },
        { concepto: 'Examen Complexivo', monto: 100, estado: 'pendiente' },
      ],
      clearanceStatus: 'pending',
    },
    {
      id: 3,
      estudiante: 'María Vásquez',
      carrera: 'Contabilidad',
      aranceles: [
        { concepto: 'Matrícula', monto: 120, estado: 'rechazado' },
        { concepto: 'Certificado', monto: 20, estado: 'pendiente' },
      ],
      clearanceStatus: 'rejected',
    },
  ];

  // Lista filtrada
  get filtered() {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(it =>
      it.estudiante.toLowerCase().includes(q) ||
      it.carrera.toLowerCase().includes(q)
    );
  }

  total(it: { aranceles: Array<{ monto: number }> }) {
    return it.aranceles.reduce((s, a) => s + a.monto, 0);
  }

  // Estado de aranceles: Activo si no debe nada (todos aprobados), Inactivo si tiene deudas pendientes o rechazadas
  isActivo(it: { aranceles: Array<{ estado: 'pendiente' | 'aprobado' | 'rechazado' }> }): boolean {
    return it.aranceles.length > 0 && it.aranceles.every(a => a.estado === 'aprobado');
  }

  estadoLabel(it: { aranceles: Array<{ estado: 'pendiente' | 'aprobado' | 'rechazado' }> }): 'Activo' | 'Inactivo' {
    return this.isActivo(it) ? 'Activo' : 'Inactivo';
  }

  // Acciones
  aceptar(itemId: number) {
    const it = this.items.find(x => x.id === itemId);
    if (!it) return;
    // Solo se acepta si está Activo (no debe nada)
    if (this.isActivo(it)) {
      it.clearanceStatus = 'approved';
    } else {
      it.clearanceStatus = 'rejected';
    }
  }

  rechazar(itemId: number) {
    const it = this.items.find(x => x.id === itemId);
    if (!it) return;
    it.clearanceStatus = 'rejected';
  }

  generarCertificado(itemId: number) {
    // Placeholder: aquí llamarías a un endpoint para generar el certificado PDF
    // Por ahora, solo mostramos un mensaje en consola
    const it = this.items.find(x => x.id === itemId);
    if (!it) return;
    // Solo generar si está aprobado y Activo (sin deudas)
    if (it.clearanceStatus !== 'approved' || !this.isActivo(it)) {
      console.warn('No se puede generar certificado: clearance no aprobado');
      return;
    }
    console.log('Generar certificado de no adeudar para', it.estudiante);
    // En producción: this.tesoreriaService.generarCertificado(itemId).subscribe(...)
  }
}
