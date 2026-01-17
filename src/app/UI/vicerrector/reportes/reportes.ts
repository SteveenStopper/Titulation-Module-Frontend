import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  // Resumen general (desde backend)
  resumen = [
    { titulo: 'Total carreras', valor: 0, icono: 'fa-school', color: 'text-indigo-600' },
    { titulo: 'Materias registradas', valor: 0, icono: 'fa-book', color: 'text-emerald-600' },
    { titulo: 'Tutores asignados', valor: 0, icono: 'fa-user-tie', color: 'text-sky-600' },
    { titulo: 'Publicables', valor: 0, icono: 'fa-bullhorn', color: 'text-amber-600' },
  ];

  // Distribución por carrera (desde backend)
  distribucionCarreras: Array<{ carrera: string; registradas: number; publicadas: number }> = [];

  // Top tutores por cantidad de materias asignadas (desde backend)
  topTutores: Array<{ tutor: string; asignadas: number }> = [];

  totalReg(): number {
    return this.distribucionCarreras.reduce((acc, c) => acc + c.registradas, 0);
  }

  pctPublicado(c: { registradas: number; publicadas: number }): number {
    if (!c.registradas) return 0;
    return Math.round((c.publicadas / c.registradas) * 100);
  }

  // Select de período (solo para imprimir periodos anteriores)
  periodOptionsPrint: string[] = [];
  selectedPeriodPrint: string | undefined = undefined;

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    // Cargar datos iniciales (período activo por defecto)
    this.fetchAll();

    // Cargar periodos disponibles para impresión de históricos
    this.periodSvc.listAll().subscribe(list => {
      this.periodOptionsPrint = (list || []).map(p => p.name);
    });

    // Mostrar nombre del período activo en el select por defecto
    const active = this.periodSvc.getActivePeriod();
    this.selectedPeriodPrint = active || undefined;
    this.periodSvc.activePeriod$.subscribe(p => {
      // Mantener sincronizado si el activo cambia (sin pisar selección manual si ya eligieron algo distinto)
      if (!this.selectedPeriodPrint) this.selectedPeriodPrint = p || undefined;
    });
  }

  private fetchAll(period?: string) {
    const q = period ? `?period=${encodeURIComponent(period)}` : '';
    // Resumen
    this.http.get<{ carrerasActivas: number; materiasRegistradas: number; publicables: number; tutoresDisponibles: number }>(
      `/api/vicerrector/reportes/resumen${q}`
    ).subscribe((r) => {
      this.resumen = [
        { titulo: 'Total carreras', valor: r.carrerasActivas || 0, icono: 'fa-school', color: 'text-indigo-600' },
        { titulo: 'Materias registradas', valor: r.materiasRegistradas || 0, icono: 'fa-book', color: 'text-emerald-600' },
        { titulo: 'Tutores disponibles', valor: r.tutoresDisponibles || 0, icono: 'fa-user-tie', color: 'text-sky-600' },
        { titulo: 'Publicables', valor: r.publicables || 0, icono: 'fa-bullhorn', color: 'text-amber-600' },
      ];
    });
    // Distribución por carrera
    this.http.get<Array<{ carrera: string; registradas: number; publicadas: number }>>(
      `/api/vicerrector/reportes/distribucion-carreras${q}`
    ).subscribe((list) => {
      this.distribucionCarreras = Array.isArray(list) ? list : [];
    });
    // Top tutores
    this.http.get<Array<{ tutor: string; asignadas: number }>>(
      `/api/vicerrector/reportes/top-tutores${q}`
    ).subscribe((list) => {
      this.topTutores = Array.isArray(list) ? list : [];
    });
  }

  onChangePeriodPrint() {
    const p = this.selectedPeriodPrint;
    this.fetchAll(p);
  }

  // ===== Exportaciones (cliente) =====
  private downloadCsv(rows: (string | number)[][], filename: string) {
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  exportResumenCsv() {
    const rows: (string|number)[][] = [
      ['Métrica', 'Valor'],
      ...this.resumen.map(r => [r.titulo, r.valor])
    ];
    this.downloadCsv(rows, 'vic-resumen.csv');
  }

  exportDistribucionCsv() {
    const rows: (string|number)[][] = [
      ['Carrera', 'Registradas', 'Publicadas'],
      ...this.distribucionCarreras.map(c => [c.carrera, c.registradas, c.publicadas])
    ];
    this.downloadCsv(rows, 'vic-distribucion-carreras.csv');
  }

  exportTopTutoresCsv() {
    const rows: (string|number)[][] = [
      ['Tutor', 'Asignadas'],
      ...this.topTutores.map(t => [t.tutor, t.asignadas])
    ];
    this.downloadCsv(rows, 'vic-top-tutores.csv');
  }

  // Flags para deshabilitar botones
  get canExportResumen() { return (this.resumen || []).some(x => Number(x.valor) > 0); }
  get canExportDistribucion() { return (this.distribucionCarreras || []).length > 0; }
  get canExportTop() { return (this.topTutores || []).length > 0; }

  printPdf() {
    const w = window.open('', '_blank');
    if (!w) return;
    const origin = window.location.origin;
    const periodLabel = this.selectedPeriodPrint || this.periodSvc.getActivePeriod() || '';
    const ts = new Date().toLocaleString();
    const style = `
      <style>
        @page { margin: 14mm; }
        :root { --gray-100:#f3f4f6; --gray-200:#e5e7eb; --gray-300:#d1d5db; --gray-600:#4b5563; --gray-700:#374151; --indigo:#4f46e5; --emerald:#059669; }
        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color:#111827; }
        h1 { margin: 0 0 6px; font-size: 22px; }
        h2 { margin: 18px 0 8px; font-size: 16px; }
        .header { display:flex; align-items:center; }
        .header .right { margin-left:auto; text-align:right; color: var(--gray-700); font-weight:600; }
        .kpis { display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
        .card { border:1px solid var(--gray-200); border-radius:10px; padding:10px; background:#fff; box-shadow: 0 1px 1px rgba(0,0,0,0.04); }
        .card .title { font-size:12px; color: var(--gray-600); }
        .card .value { font-size:18px; font-weight:700; margin-top:4px; }
        table { width:100%; border-collapse: separate; border-spacing:0; margin-top: 8px; }
        thead th { background: var(--gray-100); color:#111827; font-weight:700; font-size:12px; border-top:1px solid var(--gray-300); border-bottom:1px solid var(--gray-300); }
        th,td { border-left:1px solid var(--gray-300); border-right:1px solid var(--gray-300); padding:6px 8px; font-size:12px; }
        tr:last-child td { border-bottom:1px solid var(--gray-300); }
        tr:nth-child(even) td { background:#fafafa; }
        .table-wrap { border-radius:8px; overflow:hidden; border:1px solid var(--gray-300); }
        .footer { position: fixed; bottom: 10mm; left: 14mm; right: 14mm; font-size: 11px; color: #6b7280; display:flex; justify-content: space-between; }
        @media print {
          .pagenum:after { content: counter(page); }
        }
      </style>`;
    const header = `
      <div class="header" style="gap:12px;">
        <img src="${origin}/assets/Logo.png" style="height:48px;"/>
        <div class="right">
          <div>Vicerrectorado</div>
          <div style="font-size:12px; font-weight:500;">${periodLabel}</div>
        </div>
      </div>
      <h1>Reportes Vicerrectorado - Complexivo</h1>`;
    const kpis = `
      <div class="kpis">
        ${this.resumen.map(r => `<div class="card"><div class="title">${r.titulo}</div><div class="value">${r.valor}</div></div>`).join('')}
      </div>`;
    const distRows = this.distribucionCarreras.map(c => `<tr><td>${c.carrera}</td><td>${c.registradas}</td><td>${c.publicadas}</td></tr>`).join('');
    const dist = `
      <h2>Distribución por carrera</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Carrera</th><th>Registradas</th><th>Publicadas</th></tr></thead>
          <tbody>${distRows || '<tr><td colspan="3" style="text-align:center;color:#6b7280;">Sin datos</td></tr>'}</tbody>
        </table>
      </div>`;
    const topRows = this.topTutores.map((t, i) => `<tr><td>${i+1}</td><td>${t.tutor}</td><td>${t.asignadas}</td></tr>`).join('');
    const top = `
      <h2>Top tutores</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Tutor</th><th>Asignadas</th></tr></thead>
          <tbody>${topRows || '<tr><td colspan="3" style="text-align:center;color:#6b7280;">Sin datos</td></tr>'}</tbody>
        </table>
      </div>`;
    const footer = `
      <div class="footer">
        <div>Generado: ${ts}</div>
        <div>Página <span class="pagenum"></span></div>
      </div>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${header}${kpis}${dist}${top}${footer}<script>setTimeout(()=>{window.print()},100)</script></body></html>`);
    w.document.close();
  }
}
