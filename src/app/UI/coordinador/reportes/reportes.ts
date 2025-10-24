import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare const ApexCharts: any;

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes implements AfterViewInit, OnDestroy {
  // Selector de período (mock hasta backend)
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];
  selectedPeriod: string | undefined = undefined;

  // KPIs principales
  stats = {
    inscritos: 0,
    uic: 0,
    complexivo: 0,
    vouchersPendientes: 0,
    vouchersAprobados: 0,
    defensasProgramadas: 0,
    documentosPendientes: 0
  };

  // Derivados para etiquetas y variación
  get vouchersRechazados(): number {
    const rech = this.stats.inscritos - this.stats.vouchersAprobados - this.stats.vouchersPendientes;
    return Math.max(0, rech);
  }
  get weeklyChangePct(): number {
    // Mock: variación según período seleccionado
    const idx = Math.max(0, this.periodOptions.indexOf(this.selectedPeriod || ''));
    return [12, 23, -5][idx] ?? 10;
  }

  // Detalle (mock)
  detalleEstudiantes: Array<{
    nombre: string;
    modalidad: 'UIC' | 'EXAMEN COMPLEXIVO';
    estadoVoucher: 'pendiente' | 'aprobado' | 'rechazado';
    defensa?: string | null;
  }> = [];

  ngOnInit() {
    this.selectedPeriod = undefined; // obliga a seleccionar
  }

  ngAfterViewInit() {
    // Render inicial si ya hay un período seleccionado (en general es undefined hasta que el usuario seleccione)
    setTimeout(() => this.renderOrUpdateChart(), 0);
  }

  ngOnDestroy() {
    this.destroyChart();
  }

  onPeriodChange() {
    this.recomputeStats();
    this.renderOrUpdateChart();
  }

  private recomputeStats() {
    // Mock determinista simple en base a periodo seleccionado
    const idx = Math.max(0, this.periodOptions.indexOf(this.selectedPeriod || ''));
    const base = [120, 140, 100][idx] ?? 120;
    const uic = Math.round(base * 0.56);
    const complex = base - uic;
    const pend = Math.round(base * 0.18);
    const apr = Math.round(base * 0.76);
    const def = Math.round(uic * 0.35);
    const docs = Math.round(base * 0.12);
    this.stats = {
      inscritos: base,
      uic,
      complexivo: complex,
      vouchersPendientes: pend,
      vouchersAprobados: apr,
      defensasProgramadas: def,
      documentosPendientes: docs
    };

    // Generar detalle de ejemplo
    const nombres = ['Ana', 'Luis', 'María', 'José', 'Valeria', 'Carlos', 'Andrea', 'Pedro'];
    this.detalleEstudiantes = Array.from({ length: 10 }).map((_, i) => ({
      nombre: `${nombres[i % nombres.length]} ${i + 1}`,
      modalidad: i % 2 === 0 ? 'UIC' : 'EXAMEN COMPLEXIVO',
      estadoVoucher: (['pendiente', 'aprobado', 'rechazado'] as const)[i % 3],
      defensa: i % 4 === 0 ? '2025-11-2' + (i % 10) : null
    }));
  }

  // Exportaciones
  exportKpisCsv() {
    const rows = [
      ['KPI', 'Valor'],
      ['Inscritos', String(this.stats.inscritos)],
      ['UIC', String(this.stats.uic)],
      ['Examen Complexivo', String(this.stats.complexivo)],
      ['Vouchers Pendientes', String(this.stats.vouchersPendientes)],
      ['Vouchers Aprobados', String(this.stats.vouchersAprobados)],
      ['Defensas Programadas', String(this.stats.defensasProgramadas)],
      ['Documentos Pendientes', String(this.stats.documentosPendientes)]
    ];
    this.downloadCsv(rows, 'reportes-kpis.csv');
  }

  exportDetalleCsv() {
    const rows = [
      ['Nombre', 'Modalidad', 'Estado Voucher', 'Defensa'],
      ...this.detalleEstudiantes.map(d => [d.nombre, d.modalidad, d.estadoVoucher, d.defensa ?? ''])
    ];
    this.downloadCsv(rows, 'reportes-detalle-estudiantes.csv');
  }

  printPdf() {
    const w = window.open('', '_blank');
    if (!w) return;
    const origin = window.location.origin;
    const style = `
      <style>
        @page { margin: 16mm; }
        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        h2 { margin: 0 0 8px; margin-top: 16px; }
        .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
        .card { border:1px solid #ddd; border-radius:8px; padding:10px; }
        table { width:100%; border-collapse: collapse; margin-top: 12px; }
        th,td { border:1px solid #333; padding:6px; font-size:12px; }
        th { background:#eee; }
      </style>`;
    const header = `
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${origin}/assets/Logo.png" style="height:48px;"/>
        <div style="flex:1"></div>
        <div style="font-weight:600;">${this.selectedPeriod || 'Período no seleccionado'}</div>
      </div>
      <h2>Reportes del Coordinador</h2>`;
    const kpis = `
      <div class="kpis">
        <div class="card"><div>Inscritos</div><div style="font-size:18px;font-weight:700">${this.stats.inscritos}</div></div>
        <div class="card"><div>UIC</div><div style="font-size:18px;font-weight:700">${this.stats.uic}</div></div>
        <div class="card"><div>Examen Complexivo</div><div style="font-size:18px;font-weight:700">${this.stats.complexivo}</div></div>
        <div class="card"><div>Vouchers Pendientes</div><div style="font-size:18px;font-weight:700">${this.stats.vouchersPendientes}</div></div>
        <div class="card"><div>Vouchers Aprobados</div><div style="font-size:18px;font-weight:700">${this.stats.vouchersAprobados}</div></div>
        <div class="card"><div>Defensas Programadas</div><div style="font-size:18px;font-weight:700">${this.stats.defensasProgramadas}</div></div>
      </div>`;
    const detalleRows = this.detalleEstudiantes.map(d => `
      <tr><td>${d.nombre}</td><td>${d.modalidad}</td><td>${d.estadoVoucher}</td><td>${d.defensa ?? ''}</td></tr>`).join('');
    const detalle = `
      <table>
        <thead><tr><th>Nombre</th><th>Modalidad</th><th>Estado Voucher</th><th>Defensa</th></tr></thead>
        <tbody>${detalleRows}</tbody>
      </table>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${header}${kpis}${detalle}<script>setTimeout(()=>{window.print()},100)</script></body></html>`);
    w.document.close();
  }

  private downloadCsv(rows: (string | number)[][], filename: string) {
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  // -----------------------
  // ApexCharts integration
  // -----------------------
  private chart: any | null = null;

  private buildChartOptions() {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    // Generar datos semanales proportionados a KPIs actuales
    const total = Math.max(1, this.stats.inscritos);
    const uicBase = Math.round(this.stats.uic / 7);
    const compBase = Math.round(this.stats.complexivo / 7);
    const rand = (b: number, i: number) => Math.max(0, Math.round(b + (i % 2 === 0 ? b * 0.2 : -b * 0.15)));
    const uicSeries = days.map((_, i) => rand(uicBase, i));
    const compSeries = days.map((_, i) => rand(compBase, i + 1));

    return {
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        x: { show: true },
        custom: ({ series, dataPointIndex, w }: any) => {
          const cats = w?.globals?.categoryLabels || [];
          const title = cats[dataPointIndex] ?? '';
          const names = w?.config?.series?.map((s: any) => s?.name) || [];
          const colors = w?.config?.series?.map((s: any) => s?.color) || [];
          const rows = (series || []).map((arr: number[], i: number) => {
            const val = Array.isArray(arr) ? arr[dataPointIndex] : arr;
            const name = names[i] ?? `Serie ${i+1}`;
            const color = colors[i] ?? '#555';
            return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0;">
                      <span style="width:8px;height:8px;border-radius:9999px;background:${color};display:inline-block"></span>
                      <span style="font-size:12px;color:#111;margin-right:6px;min-width:120px;">${name}</span>
                      <span style="font-size:12px;color:#111;font-weight:600">${val} estudiantes</span>
                    </div>`;
          }).join('');
          return `<div style="padding:8px 10px;">`
                 + (title ? `<div style=\"font-size:12px;color:#6b7280;border-bottom:1px solid #e5e7eb;margin-bottom:6px;padding-bottom:4px;\">${title}</div>` : '')
                 + rows + `</div>`;
        }
      },
      grid: { show: false, strokeDashArray: 4, padding: { left: 2, right: 2, top: -26 } },
      series: [
        { name: 'UIC', data: uicSeries, color: '#1A56DB' },
        { name: 'Examen Complexivo', data: compSeries, color: '#7E3BF2' }
      ],
      chart: { height: '100%', maxWidth: '100%', type: 'area', fontFamily: 'Inter, sans-serif', dropShadow: { enabled: false }, toolbar: { show: false } },
      legend: { show: true },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.55, opacityTo: 0, shade: '#1C64F2', gradientToColors: ['#1C64F2'] } },
      dataLabels: { enabled: false },
      markers: { size: 3, hover: { size: 5 } },
      stroke: { width: 3, curve: 'smooth' },
      xaxis: { categories: days, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { show: false, labels: { formatter: (v: number) => String(v) } }
    };
  }

  private renderOrUpdateChart() {
    const el = document.getElementById('tooltip-chart');
    if (!el || (typeof ApexCharts === 'undefined')) return;
    const opts = this.buildChartOptions();
    if (this.chart) {
      this.chart.updateOptions(opts);
    } else {
      this.chart = new ApexCharts(el, opts);
      this.chart.render();
    }
  }

  private destroyChart() {
    if (this.chart) { try { this.chart.destroy(); } catch {} finally { this.chart = null; } }
  }
}
