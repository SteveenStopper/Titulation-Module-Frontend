import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { SearchableSelectComponent } from '../../../core/components/searchable-select.component';

@Component({
  selector: 'app-gestion-examenes',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchableSelectComponent],
  templateUrl: './gestion-examenes.html',
  styleUrl: './gestion-examenes.scss'
})
export class GestionExamenes {
  // Filtro por carrera
  carreraFiltroId: number | null = null;
  // Flujo de registro (selección dependiente)
  carreraAsignacionId: number | null = null;
  // Materia (en UI) ahora representa Semestre/Curso
  materiaAsignacionId: number | null = null;
  // Nuevo: Asignatura real por carrera+semestre
  asignaturaAsignacionId: number | null = null;
  tutorAsignacionId: number | null = null;

  // Límite de materias por carrera
  readonly MAX_MATERIAS = 4;

  // Docentes disponibles para tutoría (cargados desde backend)
  docentes: Array<{ id: number; nombre: string }> = [];

  // Catálogo desde Instituto
  carrerasCat: Array<{ id: number; nombre: string }> = [];
  private carreraIdToName = new Map<number, string>();
  // Semestres por carrera
  materiasCat: Array<{ id: number; nombre: string }> = [];
  // Asignaturas por carrera (y opcionalmente por semestre)
  asignaturasCat: Array<{ id: number; nombre: string }> = [];

  // Catálogo de semestres por carrera (dinámico desde Instituto)
  catalogoMaterias: Record<string, Array<{ id: number; nombre: string }>> = {};
  // Catálogo de asignaturas por llave carrera|semestre
  catalogoAsignaturas: Record<string, Array<{ id: number; nombre: string }>> = {};

  // Registros creados por carrera (materia + tutor asignado)
  registros: Array<{
    id: number;           // id materia
    nombre: string;       // nombre materia
    carrera: string | null;
    carreraId: number | null;
    tutorId: number | null;
    tutorSearch?: string;
    seleccionarTutorId?: number | null;
    editing?: boolean;
    publicado?: boolean;
  }> = [];

  // Toast (estilo similar a Tutor UIC)
  showToast = false;
  toastMsg = '';
  toastOk = true;

  private normalizeText(s: string): string {
    return String(s || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private toTitleCase(name: string): string {
    const s = String(name || '').trim();
    if (!s) return '';
    return s
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map(p => p.length ? (p[0].toUpperCase() + p.slice(1)) : p)
      .join(' ');
  }

  private onlyTecnologiaAndUnique(list: Array<{ id: number; nombre: string }>): Array<{ id: number; nombre: string }> {
    const seen = new Set<string>();
    const out: Array<{ id: number; nombre: string }> = [];
    for (const c of Array.isArray(list) ? list : []) {
      const id = Number((c as any)?.id);
      const nombre = String((c as any)?.nombre || '');
      if (!Number.isFinite(id) || !nombre.trim()) continue;
      const keyName = this.normalizeText(nombre);
      if (!keyName.includes('TECNOLOGIA')) continue;
      if (seen.has(keyName)) continue;
      seen.add(keyName);
      out.push({ id, nombre });
    }
    return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private uniqueByNombreNormalized(list: Array<{ id: number; nombre: string }>): Array<{ id: number; nombre: string }> {
    const byName = new Map<string, { id: number; nombre: string }>();
    for (const it of Array.isArray(list) ? list : []) {
      const id = Number((it as any)?.id);
      const nombre = String((it as any)?.nombre || '');
      if (!Number.isFinite(id) || !nombre.trim()) continue;
      const key = this.normalizeText(nombre);
      if (!key) continue;
      const prev = byName.get(key);
      if (!prev || id < prev.id) byName.set(key, { id, nombre: this.toTitleCase(nombre) });
    }
    return Array.from(byName.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  constructor(private http: HttpClient) {
    this.cargar(); // carga materias ya registradas en nuestro módulo
    // Docentes (Instituto)
    this.http.get<Array<{ id: number; nombre: string }>>('/api/vicerrector/docentes').subscribe(list => {
      const arr = Array.isArray(list) ? list : [];
      this.docentes = arr
        .map((d: any) => ({ id: Number(d?.id), nombre: this.toTitleCase(String(d?.nombre || '')) }))
        .filter(d => Number.isFinite(Number(d.id)) && !!d.nombre)
        .filter(d => !/^usuario\b/i.test(String(d.nombre).trim()));
    });
    // Carreras (Instituto)
    this.http.get<Array<{ id: number; nombre: string }>>('/api/vicerrector/carreras').subscribe(list => {
      this.carrerasCat = this.onlyTecnologiaAndUnique(Array.isArray(list) ? list : []);
      this.carreraIdToName = new Map(this.carrerasCat.map(c => [Number(c.id), String(c.nombre)]));
    });
  }

  // Carreras del catálogo
  get carreras(): Array<{ id: number; nombre: string }> {
    return this.onlyTecnologiaAndUnique(this.carrerasCat);
  }

  // Lista filtrada por carrera para la tabla
  get filteredMaterias() {
    if (this.carreraFiltroId === null || this.carreraFiltroId === undefined) return this.registros;
    const cid = Number(this.carreraFiltroId);
    return Number.isFinite(cid)
      ? this.registros.filter(r => Number(r.carreraId) === cid)
      : this.registros;
  }

  // Contadores por carrera
  get totalRegistradasCarreraSeleccionada(): number {
    const cid = Number(this.carreraAsignacionId);
    if (!Number.isFinite(cid) || cid === 0) return 0;
    return this.registros.filter(r => Number(r.carreraId) === cid).length;
  }

  get limiteAlcanzado(): boolean {
    return this.totalRegistradasCarreraSeleccionada >= this.MAX_MATERIAS;
  }

  // Publicación
  get totalPublicables(): number {
    const cid = Number(this.carreraAsignacionId);
    if (!Number.isFinite(cid) || cid === 0) return 0;
    return this.registros.filter(r => Number(r.carreraId) === cid && r.tutorId !== null).length;
  }

  // Materias disponibles para la carrera (excluye ya registradas)
  get materiasDeCarrera(): Array<{ id: number; nombre: string }> {
    const cid = Number(this.carreraAsignacionId);
    if (!Number.isFinite(cid)) return [];
    return this.catalogoMaterias[String(cid)] || [];
  }

  isSemestreRegistrado(semesterId: number): boolean {
    const cid = Number(this.carreraAsignacionId);
    if (!Number.isFinite(cid)) return false;
    const sid = Number(semesterId);
    if (!Number.isFinite(sid)) return false;
    return this.registros.some(r => Number(r.carreraId) === cid && Number(r.id) === sid);
  }

  get asignaturasDeCarreraSemestre(): Array<{ id: number; nombre: string }> {
    const cid = Number(this.carreraAsignacionId);
    const sid = Number(this.materiaAsignacionId);
    if (!Number.isFinite(cid)) return [];
    const key = `${cid}|${Number.isFinite(sid) ? sid : 0}`;
    return this.catalogoAsignaturas[key] || [];
  }

  // Materia actualmente seleccionada (de catálogo)
  get selectedMateria() {
    const cid = Number(this.carreraAsignacionId);
    if (!Number.isFinite(cid) || this.materiaAsignacionId === null) return null;
    return (this.catalogoMaterias[String(cid)] || []).find(x => x.id === this.materiaAsignacionId) || null;
  }

  get selectedAsignatura() {
    const cid = Number(this.carreraAsignacionId);
    const sid = Number(this.materiaAsignacionId);
    if (!Number.isFinite(cid) || this.asignaturaAsignacionId === null) return null;
    const key = `${cid}|${Number.isFinite(sid) ? sid : 0}`;
    return (this.catalogoAsignaturas[key] || []).find(x => x.id === this.asignaturaAsignacionId) || null;
  }

  onChangeCarreraAsignacion() {
    this.tutorAsignacionId = null;
    this.asignaturaAsignacionId = null;
    // 0 => ver todas las carreras
    if (Number(this.carreraAsignacionId) === 0) {
      this.carreraFiltroId = null;
      this.materiaAsignacionId = null;
      this.materiasCat = [];
      this.asignaturasCat = [];
      return;
    }
    this.carreraFiltroId = this.carreraAsignacionId;
    // cargar semestres desde Instituto para esta carrera y ponerlos en el catálogo dinámico
    const careerId = Number(this.carreraAsignacionId);
    if (!Number.isFinite(careerId)) { this.catalogoMaterias[String(careerId)] = []; this.materiasCat = []; this.materiaAsignacionId = null; this.asignaturasCat = []; return; }
    this.http.get<Array<{ id: number; nombre: string }>>(`/api/vicerrector/semestres-catalogo?careerId=${careerId}`).subscribe(list => {
      this.materiasCat = this.uniqueByNombreNormalized(Array.isArray(list) ? list : []);
      this.catalogoMaterias[String(careerId)] = this.materiasCat;
      const lista = this.materiasDeCarrera;
      const firstAvailable = lista.find(m => !this.isSemestreRegistrado(m.id)) || null;
      this.materiaAsignacionId = firstAvailable ? firstAvailable.id : (lista.length ? lista[0].id : null);
      this.onChangeMateriaAsignacion();
    });
  }

  onChangeMateriaAsignacion() {
    this.tutorAsignacionId = null;
    this.asignaturaAsignacionId = null;
    const careerId = Number(this.carreraAsignacionId);
    const semesterId = Number(this.materiaAsignacionId);
    if (!Number.isFinite(careerId)) { this.asignaturasCat = []; return; }
    const key = `${careerId}|${Number.isFinite(semesterId) ? semesterId : 0}`;
    // si ya está en cache no recalcular
    if (Array.isArray(this.catalogoAsignaturas[key]) && this.catalogoAsignaturas[key].length) {
      this.asignaturasCat = this.catalogoAsignaturas[key];
      this.asignaturaAsignacionId = this.asignaturasCat.length ? this.asignaturasCat[0].id : null;
      return;
    }
    const qs = Number.isFinite(semesterId)
      ? `/api/vicerrector/asignaturas-catalogo?careerId=${careerId}&semesterId=${semesterId}`
      : `/api/vicerrector/asignaturas-catalogo?careerId=${careerId}`;
    this.http.get<Array<{ id: number; nombre: string }>>(qs).subscribe(list => {
      this.asignaturasCat = this.uniqueByNombreNormalized(Array.isArray(list) ? list : []);
      this.catalogoAsignaturas[key] = this.asignaturasCat;
      this.asignaturaAsignacionId = this.asignaturasCat.length ? this.asignaturasCat[0].id : null;
    });
  }

  onChangeAsignaturaAsignacion() {
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
        this.toastOk = true; this.toastMsg = 'Tutor actualizado'; this.showToast = true; setTimeout(() => this.showToast = false, 2500);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo actualizar el tutor'; this.showToast = true; setTimeout(() => this.showToast = false, 3500); }
    });
  }

  // Acciones del bloque superior (asignación directa por selects)
  // Registro superior: agregar nueva materia con tutor
  agregarRegistro() {
    if (!Number.isFinite(Number(this.carreraAsignacionId)) || this.materiaAsignacionId === null || this.asignaturaAsignacionId === null || this.tutorAsignacionId === null) return;
    if (this.limiteAlcanzado) return;
    const cat = this.selectedAsignatura;
    if (!cat) return;
    const careerId = Number(this.carreraAsignacionId);
    if (!Number.isFinite(careerId)) return;
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
        this.toastOk = true; this.toastMsg = 'Materia registrada'; this.showToast = true; setTimeout(() => this.showToast = false, 2500);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo registrar la materia'; this.showToast = true; setTimeout(() => this.showToast = false, 3500); }
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
        carrera: (r as any).carrera ?? null,
        carreraId: Number((r as any).carrera_id) || null,
        tutorId: r.tutorId,
        publicado: false,
      }));
    });
  }

  publicarTodo() {
    const careerId = Number(this.carreraAsignacionId);
    if (!Number.isFinite(careerId)) return;
    this.http.post('/api/vicerrector/complexivo/materias/publicar', { careerId }).subscribe({
      next: (res: any) => {
        this.toastOk = true; this.toastMsg = `Publicación realizada. Total publicadas: ${res?.published ?? 0}`; this.showToast = true; setTimeout(() => this.showToast = false, 3000);
      },
      error: () => { this.toastOk = false; this.toastMsg = 'No se pudo publicar'; this.showToast = true; setTimeout(() => this.showToast = false, 3500); }
    });
  }
}
