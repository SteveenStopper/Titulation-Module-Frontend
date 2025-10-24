import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-docente-complexivo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './docente-complexivo.html',
  styleUrl: './docente-complexivo.scss'
})
export class DocenteComplexivo {
  view: 'mis-materias' | 'estudiantes' = 'mis-materias';

  materias: Array<{
    id: string;
    nombre: string;
    codigo: string;
    periodo: string;
    estudiantesAsignados: number;
    publicado: boolean;
    asignadoADocente: boolean;
  }> = [
    { id: 'm1', nombre: 'Matemática Aplicada', codigo: 'MAT-201', periodo: '2025-1', estudiantesAsignados: 32, publicado: true, asignadoADocente: true },
    { id: 'm2', nombre: 'Programación Avanzada', codigo: 'INF-305', periodo: '2025-1', estudiantesAsignados: 28, publicado: true, asignadoADocente: true },
    { id: 'm3', nombre: 'Metodología de la Investigación', codigo: 'INV-210', periodo: '2025-1', estudiantesAsignados: 0, publicado: false, asignadoADocente: true },
  ];

  constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef) {
    const initialId = this.route.snapshot.queryParamMap.get('materiaId');
    if (initialId) {
      this.seleccionMateriaId = initialId;
      this.cargarEstudiantesDeMateria(initialId);
    }
    this.route.queryParamMap.subscribe(qp => {
      const id = qp.get('materiaId');
      if (id && id !== this.seleccionMateriaId) {
        this.seleccionMateriaId = id;
        this.cargarEstudiantesDeMateria(id);
      }
    });
  }

  // (vista controlada solo por seleccionMateriaId)

  get publicadasAsignadas() {
    return this.materias.filter(m => m.publicado && m.asignadoADocente);
  }

  // Navegación
  viewEstudiantes(m: { id: string }) {
    // ya no navegamos por router; controlamos con seleccionMateriaId
    this.seleccionMateriaId = m.id;
    this.cargarEstudiantesDeMateria(m.id);
    this.cdr.detectChanges();
  }

  onClickVerEstudiantes(m: { id: string }) {
    // Forzar estado de vista y datos inmediatamente sin cambiar de ruta
    this.viewEstudiantes(m);
  }

  volverMisMaterias() {
    this.seleccionMateriaId = null;
    this.estudiantesMateria = [];
  }

  // Asistencia
  seleccionMateriaId: string | null = null;
  fechaHoy: string = new Date().toISOString().slice(0, 10);
  estudiantesMateria: Array<{ id: string; nombre: string; presente: boolean }> = [];
  attendanceHistory: Array<{ date: string; items: Array<{ id: string; nombre: string; presente: boolean }> }> = [];

  get historyExceptToday() {
    return this.attendanceHistory.filter(h => h.date !== this.fechaHoy);
  }

  get materiaSeleccionada() {
    return this.materias.find(x => x.id === this.seleccionMateriaId) || null;
  }

  private cargarEstudiantesDeMateria(materiaId: string) {
    // MOCK: lista según materia
    const base: Record<string, Array<{ id: string; nombre: string }>> = {
      m1: [
        { id: 'e1', nombre: 'Ana Torres' },
        { id: 'e2', nombre: 'Luis García' },
        { id: 'e3', nombre: 'Sofía Ramírez' },
      ],
      m2: [
        { id: 'e4', nombre: 'Pedro López' },
        { id: 'e5', nombre: 'María León' },
      ],
      m3: [],
    };
    const lista = base[materiaId] ?? [];
    this.estudiantesMateria = lista.map(x => ({ ...x, presente: false }));
    this.attendanceHistory = this.loadHistory(materiaId);
  }

  guardarAsistencia() {
    const presentes = this.estudiantesMateria.filter(x => x.presente).map(x => x.nombre);
    if (!this.seleccionMateriaId) return;
    const record = { date: this.fechaHoy, items: this.estudiantesMateria.map(x => ({ id: x.id, nombre: x.nombre, presente: x.presente })) };
    const history = this.loadHistory(this.seleccionMateriaId);
    const idx = history.findIndex(h => h.date === this.fechaHoy);
    if (idx >= 0) history[idx] = record; else history.push(record);
    history.sort((a, b) => b.date.localeCompare(a.date));
    this.saveHistory(this.seleccionMateriaId, history);
    this.attendanceHistory = history;
    alert(`Asistencia guardada para ${this.materiaSeleccionada?.nombre || ''} - ${this.fechaHoy}\nPresentes: ${presentes.join(', ') || 'Ninguno'}`);
  }

  exportarAsistenciaPdf() {
    if (!this.materiaSeleccionada) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const title = `Asistencias - ${this.materiaSeleccionada.nombre} (${this.materiaSeleccionada.codigo})`;
    const rows = this.attendanceHistory.map(h => {
      const items = h.items.map(i => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i.nombre}</td><td style="padding:4px 8px;border:1px solid #ddd; text-align:center;">${i.presente ? 'Presente' : 'Ausente'}</td></tr>`).join('');
      return `<h3 style=\"margin:16px 0 8px;font-family:Arial\">Fecha: ${h.date}</h3><table style=\"border-collapse:collapse;width:100%;font-family:Arial;font-size:12px\"><thead><tr><th style=\"padding:6px 8px;border:1px solid #ddd;text-align:left\">Estudiante</th><th style=\"padding:6px 8px;border:1px solid #ddd; text-align:center\">Asistencia</th></tr></thead><tbody>${items}</tbody></table>`;
    }).join('<hr style=\"margin:16px 0;border:none;border-top:1px solid #eee\"/>');
    win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"/><title>${title}</title></head><body style=\"padding:16px\"><h1 style=\"font-family:Arial;margin:0 0 8px\">${title}</h1>${rows}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  private keyFor(materiaId: string) { return `asistencia_${materiaId}`; }
  private loadHistory(materiaId: string) {
    try {
      const raw = localStorage.getItem(this.keyFor(materiaId));
      if (!raw) return [] as Array<{ date: string; items: Array<{ id: string; nombre: string; presente: boolean }> }>;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      return [];
    }
  }
  private saveHistory(materiaId: string, history: Array<{ date: string; items: Array<{ id: string; nombre: string; presente: boolean }> }>) {
    localStorage.setItem(this.keyFor(materiaId), JSON.stringify(history));
  }
}
