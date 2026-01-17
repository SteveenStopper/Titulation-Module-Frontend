import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

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
  }> = [];

  constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private http: HttpClient) {
    // cargar mis materias desde backend
    this.http.get<Array<{ id: string; nombre: string; codigo: string; periodo: string; estudiantesAsignados: number; publicado: boolean; asignadoADocente: boolean }>>('/api/docente/complexivo/mis-materias')
      .subscribe(list => { this.materias = Array.isArray(list) ? list : []; });
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
    // Estudiantes asignados (aprox. por historial) desde backend
    this.http.get<Array<{ id: string; nombre: string }>>(`/api/docente/complexivo/materias/${materiaId}/estudiantes`)
      .subscribe(list => {
        const alumnos = Array.isArray(list) ? list : [];
        // Cargar asistencia del día de hoy
        this.http.get<Array<{ id: string; nombre: string; presente: boolean }>>(`/api/docente/complexivo/materias/${materiaId}/asistencia`, { params: { fecha: this.fechaHoy } })
          .subscribe(hoy => {
            const mapHoy = new Map((hoy || []).map(x => [x.id, x.presente]));
            this.estudiantesMateria = alumnos.map(a => ({ id: a.id, nombre: a.nombre, presente: !!mapHoy.get(a.id) }));
          }, _ => {
            this.estudiantesMateria = alumnos.map(a => ({ id: a.id, nombre: a.nombre, presente: false }));
          });
        // Cargar historial de fechas y por cada una su asistencia
        this.http.get<string[]>(`/api/docente/complexivo/materias/${materiaId}/asistencia/fechas`).subscribe(fechas => {
          const dates = (fechas || []).filter(f => f !== this.fechaHoy);
          const history: Array<{ date: string; items: Array<{ id: string; nombre: string; presente: boolean }> }> = [];
          let pending = dates.length;
          if (pending === 0) { this.attendanceHistory = []; return; }
          for (const d of dates) {
            this.http.get<Array<{ id: string; nombre: string; presente: boolean }>>(`/api/docente/complexivo/materias/${materiaId}/asistencia`, { params: { fecha: d } })
              .subscribe(items => {
                history.push({ date: d, items: Array.isArray(items) ? items : [] });
              }, _ => {
                history.push({ date: d, items: [] });
              }).add(() => {
                pending -= 1;
                if (pending === 0) {
                  history.sort((a,b)=> b.date.localeCompare(a.date));
                  this.attendanceHistory = history;
                }
              });
          }
        });
      });
  }

  guardarAsistencia() {
    if (!this.seleccionMateriaId) return;
    const payload = { fecha: this.fechaHoy, items: this.estudiantesMateria.map(x => ({ id: x.id, presente: x.presente })) };
    this.http.put(`/api/docente/complexivo/materias/${this.seleccionMateriaId}/asistencia`, payload)
      .subscribe(() => {
        // refrescar historial (añadir/actualizar fecha de hoy en la parte superior)
        const record = { date: this.fechaHoy, items: this.estudiantesMateria.map(x => ({ id: x.id, nombre: x.nombre, presente: x.presente })) };
        const history = this.attendanceHistory.filter(h => h.date !== this.fechaHoy);
        this.attendanceHistory = [record, ...history];
        alert('Asistencia guardada.');
      }, () => alert('No se pudo guardar asistencia.'));
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

  // Persistencia de historial ahora desde backend (métodos locales eliminados)
}
