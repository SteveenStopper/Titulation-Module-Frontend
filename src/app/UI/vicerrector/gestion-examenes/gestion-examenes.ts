import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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

  // Docentes disponibles para tutoría (cargados desde backend)
  docentes: Array<{ id: number; nombre: string }> = [];

  // Catálogo desde Instituto
  carrerasCat: Array<{ id: number; nombre: string }> = [];
  private carreraNameToId = new Map<string, number>();
  materiasCat: Array<{ id: number; nombre: string }> = [];

  // Catálogo de materias por carrera (dinámico desde Instituto)
  catalogoMaterias: Record<string, Array<{ id: number; nombre: string }>> = {};

  // Registros creados por carrera (materia + tutor asignado)
  registros: Array<{
    id: number;           // id materia
    nombre: string;       // nombre materia
    carrera: string | null;
    tutorId: number | null;
    seleccionarTutorId?: number | null;
    editing?: boolean;
    publicado?: boolean;
  }> = [];

  // Toast (estilo similar a Tutor UIC)
  showToast = false;
  toastMsg = '';
  toastOk = true;

  constructor(private http: HttpClient) {
    this.cargar(); // carga materias ya registradas en nuestro módulo
    // Docentes (Instituto)
    this.http.get<Array<{ id: number; nombre: string }>>('/api/vicerrector/docentes').subscribe(list => {
      this.docentes = Array.isArray(list) ? list : [];
    });
    // Carreras (Instituto)
    this.http.get<Array<{ id: number; nombre: string }>>('/api/vicerrector/carreras').subscribe(list => {
      this.carrerasCat = Array.isArray(list) ? list : [];
      this.carreraNameToId = new Map(this.carrerasCat.map(c => [c.nombre, c.id]));
    });
  }

  // Carreras del catálogo
  get carreras(): string[] {
    // Mostrar nombres desde Instituto excluyendo las carreras con 4 materias ya registradas
    const countByCarrera = new Map<string, number>();
    for (const r of this.registros) {
      if (!r.carrera) continue;
      countByCarrera.set(r.carrera, (countByCarrera.get(r.carrera) || 0) + 1);
    }
    return this.carrerasCat
      .map(c => c.nombre)
      .filter(nombre => (countByCarrera.get(nombre) || 0) < this.MAX_MATERIAS)
      .sort();
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
    this.tutorAsignacionId = null;
    this.carreraFiltro = this.carreraAsignacion;
    // cargar materias desde Instituto para esta carrera y ponerlas en el catálogo dinámico
    const careerId = this.carreraNameToId.get(this.carreraAsignacion || '') || null;
    if (!careerId) { this.catalogoMaterias[this.carreraAsignacion] = []; this.materiasCat = []; this.materiaAsignacionId = null; return; }
    this.http.get<Array<{ id: number; nombre: string }>>(`/api/vicerrector/materias-catalogo?careerId=${careerId}`).subscribe(list => {
      this.materiasCat = Array.isArray(list) ? list : [];
      this.catalogoMaterias[this.carreraAsignacion] = this.materiasCat;
      const lista = this.materiasDeCarrera;
      this.materiaAsignacionId = lista.length ? lista[0].id : null;
    });
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
    const tutorId = m.seleccionarTutorId ?? null;
    this.http.put(`/api/vicerrector/complexivo/materias/${m.id}/tutor`, { tutorId }).subscribe({
      next: () => {
        m.tutorId = tutorId;
        m.editing = false;
        this.toastOk = true; this.toastMsg = 'Tutor actualizado'; this.showToast = true; setTimeout(()=> this.showToast=false, 2500);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo actualizar el tutor'; this.showToast = true; setTimeout(()=> this.showToast=false, 3500); }
    });
  }

  // Acciones del bloque superior (asignación directa por selects)
  // Registro superior: agregar nueva materia con tutor
  agregarRegistro() {
    if (!this.carreraAsignacion || this.materiaAsignacionId === null || this.tutorAsignacionId === null) return;
    if (this.limiteAlcanzado) return;
    const cat = this.selectedMateria;
    if (!cat) return;
    const careerId = this.carreraNameToId.get(this.carreraAsignacion);
    if (!careerId) return;
    // Crear en nuestro módulo
    this.http.post('/api/vicerrector/complexivo/materias', {
      careerId: careerId,
      code: String(cat.id),
      name: cat.nombre,
      tutorId: this.tutorAsignacionId
    }).subscribe({
      next: () => {
        // refrescar lista desde backend
        this.cargar();
        this.toastOk = true; this.toastMsg = 'Materia registrada'; this.showToast = true; setTimeout(()=> this.showToast=false, 2500);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo registrar la materia'; this.showToast = true; setTimeout(()=> this.showToast=false, 3500); }
    });
  }

  // Opciones de tutores
  opcionesDocentesPara(m: { tutorId: number | null; editing?: boolean }) {
    const actual = m.tutorId ?? null;
    // Si no está en edición y ya existe tutor, no mostramos el tutor actual en el dropdown
    return this.docentes.filter(d => (m.editing ? true : d.id !== actual));
  }

  opcionesDocentesTop() { return this.docentes; }

  private cargar() {
    this.http.get<Array<{ id: number; nombre: string; carrera: string | null; tutorId: number | null }>>('/api/vicerrector/complexivo/materias').subscribe(list => {
      const arr = Array.isArray(list) ? list : [];
      this.registros = arr.map(r => ({
        id: r.id,
        nombre: r.nombre,
        carrera: r.carrera ?? null,
        tutorId: r.tutorId,
        publicado: false,
      }));
    });
  }

  publicarTodo() {
    const careerId = this.carreraNameToId.get(this.carreraAsignacion) || null;
    if (!careerId) return;
    this.http.post('/api/vicerrector/complexivo/materias/publicar', { careerId }).subscribe({
      next: (res: any) => {
        this.toastOk = true; this.toastMsg = `Publicación realizada. Total publicadas: ${res?.published ?? 0}`; this.showToast = true; setTimeout(()=> this.showToast=false, 3000);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo publicar'; this.showToast = true; setTimeout(()=> this.showToast=false, 3500); }
    });
  }
}
