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
    carrera: string | null;
    estudiantesAsignados: number;
    publicado: boolean;
    asignadoADocente: boolean;
  }> = [];

  constructor(private router: Router, private route: ActivatedRoute, private cdr: ChangeDetectorRef, private http: HttpClient) {
    // cargar mis materias desde backend
    this.http.get<Array<{ id: string; nombre: string; codigo: string; periodo: string; carrera: string | null; estudiantesAsignados: number; publicado: boolean; asignadoADocente: boolean }>>('/api/docente/complexivo/mis-materias')
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
    const logoUrl = `${window.location.origin}/assets/Logo.png`;
    const fondoUrl = `${window.location.origin}/assets/Fondo_doc.jpg`;
    const rows = this.attendanceHistory.map(h => {
      const items = h.items.map(i => `<tr><td style="padding:4px 8px;border:1px solid #ddd;">${i.nombre}</td><td style="padding:4px 8px;border:1px solid #ddd; text-align:center;">${i.presente ? 'Presente' : 'Ausente'}</td></tr>`).join('');
      return `
        <div class="section">
          <div class="section-title">Fecha: ${h.date}</div>
          <table class="tbl">
            <thead>
              <tr>
                <th style="text-align:left">Estudiante</th>
                <th style="text-align:center; width: 160px">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              ${items}
            </tbody>
          </table>
        </div>
      `;
    }).join('<div class="divider"></div>');
    win.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
            .page { position: relative; min-height: 100vh; }
            .bg {
              position: fixed;
              inset: 0;
              z-index: 0;
              background-image: url('${fondoUrl}');
              background-size: cover;
              background-position: center;
              background-repeat: no-repeat;
              opacity: 0.18;
            }
            .content { position: relative; z-index: 1; }
            .header { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 14px; }
            .header img { height: 56px; }
            .header .meta { flex: 1; }
            .header .meta .inst { font-size: 14px; font-weight: 700; margin: 0; }
            .header .meta .doc { font-size: 12px; margin: 2px 0 0; color: #374151; }
            .title { font-size: 18px; font-weight: 800; margin: 0 0 8px; }
            .subtitle { font-size: 12px; color: #374151; margin: 0 0 14px; }
            .section { margin: 14px 0; }
            .section-title { font-size: 12px; font-weight: 700; margin: 0 0 8px; }
            .tbl { border-collapse: collapse; width: 100%; font-size: 12px; background: white; }
            .tbl th { background: #f3f4f6; color: #111827; padding: 8px 10px; border: 1px solid #e5e7eb; }
            .tbl td { padding: 7px 10px; border: 1px solid #e5e7eb; }
            .divider { margin: 14px 0; border-top: 1px solid #e5e7eb; }
            .footer { margin-top: 16px; font-size: 10px; color: #6b7280; text-align: right; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="bg"></div>
            <div class="content">
              <div class="header">
                <img src="${logoUrl}" alt="Logo" />
                <div class="meta">
                  <p class="inst">Instituto Superior Tecnológico “Los Andes”</p>
                  <p class="doc">Registro de asistencias</p>
                </div>
              </div>
              <h1 class="title">${title}</h1>
              <p class="subtitle">Generado: ${new Date().toISOString().slice(0,10)}</p>
              ${rows}
              <div class="footer">Sistema de Titulación</div>
            </div>
          </div>
        </body>
      </html>`);
    win.document.close();
    win.focus();
    win.print();
  }
}
