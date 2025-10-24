import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestion-examenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-examenes.html',
  styleUrl: './gestion-examenes.scss'
})
export class GestionExamenes {
  // Filtro por carrera
  carreraFiltro = '';
  // Flujo de registro (selección dependiente)
  carreraAsignacion = '';
  materiaAsignacionId: number | null = null;
  tutorAsignacionId: number | null = null;

  // Límite de materias por carrera
  readonly MAX_MATERIAS = 4;

  // Docentes disponibles para tutoría (mock)
  docentes: Array<{ id: number; nombre: string }> = [
    { id: 1, nombre: 'Ing. Ana Pérez' },
    { id: 2, nombre: 'Ing. Luis Romero' },
    { id: 3, nombre: 'Msc. María Vásquez' },
    { id: 4, nombre: 'PhD. José Vera' },
    { id: 5, nombre: 'Ing. Valeria Soto' },
    { id: 6, nombre: 'Msc. Carlos Ruiz' },
  ];

  // Catálogo de materias por carrera (4 por carrera)
  catalogoMaterias: Record<string, Array<{ id: number; nombre: string }>> = {
    'Desarrollo de Software': [
      { id: 101, nombre: 'Materia 1' },
      { id: 102, nombre: 'Materia 2' },
      { id: 103, nombre: 'Materia 3' },
      { id: 104, nombre: 'Materia 4' },
    ],
    'Electromecánica': [
      { id: 201, nombre: 'Materia 1' },
      { id: 202, nombre: 'Materia 2' },
      { id: 203, nombre: 'Materia 3' },
      { id: 204, nombre: 'Materia 4' },
    ],
    'Contabilidad': [
      { id: 301, nombre: 'Materia 1' },
      { id: 302, nombre: 'Materia 2' },
      { id: 303, nombre: 'Materia 3' },
      { id: 304, nombre: 'Materia 4' },
    ],
  };

  // Registros creados por carrera (materia + tutor asignado)
  registros: Array<{
    id: number;           // id materia
    nombre: string;       // nombre materia
    carrera: string;
    tutorId: number | null;
    seleccionarTutorId?: number | null;
    editing?: boolean;
    publicado?: boolean;
  }> = [
    // ejemplo pre-existente (puede estar vacío)
    { id: 101, nombre: 'Materia 1', carrera: 'Desarrollo de Software', tutorId: 1, publicado: false },
  ];

  // Carreras del catálogo
  get carreras(): string[] {
    return Object.keys(this.catalogoMaterias).sort();
  }

  // Lista filtrada por carrera para la tabla
  get filteredMaterias() {
    return this.carreraFiltro
      ? this.registros.filter(r => r.carrera === this.carreraFiltro)
      : this.registros;
  }

  // Contadores por carrera
  get totalRegistradasCarreraSeleccionada(): number {
    if (!this.carreraAsignacion) return 0;
    return this.registros.filter(r => r.carrera === this.carreraAsignacion).length;
  }

  get limiteAlcanzado(): boolean {
    return this.totalRegistradasCarreraSeleccionada >= this.MAX_MATERIAS;
  }

  // Publicación
  get totalPublicables(): number {
    if (!this.carreraAsignacion) return 0;
    return this.registros.filter(r => r.carrera === this.carreraAsignacion && r.tutorId !== null).length;
  }

  publicarTodo() {
    if (!this.carreraAsignacion) return;
    const aPublicar = this.registros.filter(r => r.carrera === this.carreraAsignacion && r.tutorId !== null);
    if (aPublicar.length === 0) return;
    // Simular envío a backend y marcar como publicado
    for (const r of aPublicar) {
      r.publicado = true;
    }
    console.log(`Publicadas ${aPublicar.length} materias para ${this.carreraAsignacion}`);
  }

  // Materias disponibles para la carrera (excluye ya registradas)
  get materiasDeCarrera(): Array<{ id: number; nombre: string }> {
    if (!this.carreraAsignacion) return [];
    const todas = this.catalogoMaterias[this.carreraAsignacion] || [];
    const ya = new Set(this.registros.filter(r => r.carrera === this.carreraAsignacion).map(r => r.id));
    return todas.filter(m => !ya.has(m.id));
  }

  // Materia actualmente seleccionada (de catálogo)
  get selectedMateria() {
    if (!this.carreraAsignacion || this.materiaAsignacionId === null) return null;
    return (this.catalogoMaterias[this.carreraAsignacion] || []).find(x => x.id === this.materiaAsignacionId) || null;
  }

  onChangeCarreraAsignacion() {
    const lista = this.materiasDeCarrera;
    this.materiaAsignacionId = lista.length ? lista[0].id : null;
    this.tutorAsignacionId = null;
    // también filtra la tabla por la misma carrera seleccionada
    this.carreraFiltro = this.carreraAsignacion;
  }

  onChangeMateriaAsignacion() {
    this.tutorAsignacionId = null;
  }

  nombreDocente(id: number | null): string {
    if (!id) return '-';
    return this.docentes.find(d => d.id === id)?.nombre || "-";
  }

  editar(m: any) {
    m.editing = true;
    m.seleccionarTutorId = m.tutorId ?? null;
  }

  guardar(m: any) {
    // Guardar la selección de tutor para la materia
    m.tutorId = m.seleccionarTutorId ?? null;
    m.editing = false;
  }

  // Acciones del bloque superior (asignación directa por selects)
  // Registro superior: agregar nueva materia con tutor
  agregarRegistro() {
    if (!this.carreraAsignacion || this.materiaAsignacionId === null || this.tutorAsignacionId === null) return;
    if (this.limiteAlcanzado) return;
    const cat = this.selectedMateria;
    if (!cat) return;
    // Evitar duplicado
    const existe = this.registros.some(r => r.carrera === this.carreraAsignacion && r.id === cat.id);
    if (existe) return;
    this.registros.push({
      id: cat.id,
      nombre: cat.nombre,
      carrera: this.carreraAsignacion,
      tutorId: this.tutorAsignacionId,
      publicado: false,
    });
    // Reset materia/tutor para permitir seguir agregando
    const lista = this.materiasDeCarrera;
    this.materiaAsignacionId = lista.length ? lista[0].id : null;
    this.tutorAsignacionId = null;
  }

  // Opciones de tutores
  opcionesDocentesPara(m: { tutorId: number | null; editing?: boolean }) {
    const actual = m.tutorId ?? null;
    // Si no está en edición y ya existe tutor, no mostramos el tutor actual en el dropdown
    return this.docentes.filter(d => (m.editing ? true : d.id !== actual));
  }

  opcionesDocentesTop() {
    // En el registro superior aún no existe tutor asignado; mostramos todos
    return this.docentes;
  }
}
