import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { PeriodService } from '../../../services/period.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  periods$!: Observable<Array<{ id: number; name: string }>>;
  filtersOpen = true;
  selectedPeriodId: number | null = null;
  reportType: 'MALLA_APROBADA' | 'REQUISITOS' | '' = '';

  previewMalla: Array<{ nro: number; estudiante: string; carrera: string; semestres_aprobados: string; promedio_general: string }> = [];
  previewRequisitos: Array<{ nro: number; estudiante: string; carrera: string; estado_validacion: string }> = [];
  previewInfo: { periodLabel: string } | null = null;

  constructor(private http: HttpClient, private periodSvc: PeriodService, private auth: AuthService) {
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: Number(p.id_academic_periods), name: String(p.name) }))),
      catchError(() => of([] as Array<{ id: number; name: string }>)),
      shareReplay(1)
    );

    const activeName = this.periodSvc.getActivePeriod();
    if (activeName && typeof activeName === 'string') {
      this.periods$.subscribe((rows) => {
        const match = (rows || []).find(r => r.name === activeName);
        if (match?.id) this.selectedPeriodId = Number(match.id);
      });
    }
  }

  toggleFilters() { this.filtersOpen = !this.filtersOpen; }

  limpiar() {
    this.reportType = '';
    this.previewMalla = [];
    this.previewRequisitos = [];
    this.previewInfo = null;
  }

  private getSignerFullName() {
    const u = this.auth.currentUserValue;
    const full = (u?.name || `${u?.firstname || ''} ${u?.lastname || ''}`.trim()).trim();
    return full || 'N/D';
  }

  private formatLongDate(d: Date) {
    const base = d.toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `Santo Domingo, ${base}`;
  }

  private escapeHtml(s: string) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private async openPrintTab(html: string) {
    const w = window.open('about:blank', '_blank');
    if (!w) return;

    try {
      w.document.open();
      w.document.write(html);
      w.document.close();

      const imgs = Array.from(w.document.images || []);
      if (imgs.length) {
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if ((img as HTMLImageElement).complete) return resolve();
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              })
          )
        );
      }

      w.focus();
      w.print();
    } catch (_) {
      try {
        w.document.open();
        w.document.write(
          '<!doctype html><html><head><meta charset="utf-8"><title>Error</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#991b1b;">No se pudo generar el reporte. Inténtalo nuevamente.</div></body></html>'
        );
        w.document.close();
      } catch (_) {}
    }
  }

  private toFixed2(v: any) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '';
    return n.toFixed(2);
  }

  private buildSemestresAprobados(r: any) {
    const sems: number[] = [];
    const scores = [r?.s1, r?.s2, r?.s3];
    for (let i = 0; i < scores.length; i++) {
      const n = Number(scores[i]);
      if (Number.isFinite(n)) sems.push(i + 1);
    }
    return sems.length ? `${sems.join(', ')}` : '';
  }

  private async fetchAllPromedios(academicPeriodId: number | null) {
    const out: any[] = [];
    const pageSize = 200;
    let page = 1;
    while (true) {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (academicPeriodId) params.set('academicPeriodId', String(academicPeriodId));
      const resp = await firstValueFrom(
        this.http.get<any>(`/api/secretaria/promedios?${params.toString()}`).pipe(catchError(() => of({ data: [], pagination: { page, pageSize } })))
      );
      const rows = Array.isArray(resp?.data) ? resp.data : [];
      if (!rows.length) break;
      out.push(...rows);
      if (rows.length < pageSize) break;
      page += 1;
    }
    return out;
  }

  async previsualizar() {
    if (!this.reportType) return;
    const periods = await firstValueFrom(this.periods$);
    const periodLabel = this.selectedPeriodId
      ? (periods.find(p => Number(p.id) === Number(this.selectedPeriodId))?.name || '')
      : 'Periodo Activo';
    this.previewInfo = { periodLabel };

    const all = await this.fetchAllPromedios(this.selectedPeriodId);

    if (this.reportType === 'MALLA_APROBADA') {
      this.previewMalla = (all || []).map((r, idx) => ({
        nro: idx + 1,
        estudiante: String(r?.nombre || '').trim(),
        carrera: String(r?.carrera || '').trim(),
        semestres_aprobados: this.buildSemestresAprobados(r),
        promedio_general: this.toFixed2(r?.promedio_general),
      }));
      this.previewRequisitos = [];
      return;
    }

    this.previewRequisitos = (all || []).map((r, idx) => {
      return {
        nro: idx + 1,
        estudiante: String(r?.nombre || '').trim(),
        carrera: String(r?.carrera || '').trim(),
        estado_validacion: String(r?.estado || '').trim(),
      };
    });
    this.previewMalla = [];
  }

  generarPdf() {
    if (!this.previewInfo || !this.reportType) return;
    if (this.reportType === 'MALLA_APROBADA') return void this.printPdfMalla(this.previewInfo, this.previewMalla);
    return void this.printPdfRequisitos(this.previewInfo, this.previewRequisitos);
  }

  private printPdfMalla(info: { periodLabel: string }, rows: Array<{ nro: number; estudiante: string; carrera: string; semestres_aprobados: string; promedio_general: string }>) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();
    const pageSize = 29;
    const chunks: Array<Array<any>> = [];
    for (let i = 0; i < (rows || []).length; i += pageSize) chunks.push((rows || []).slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td>${this.escapeHtml(r.carrera)}</td>
        <td>${this.escapeHtml(r.semestres_aprobados)}</td>
        <td style="text-align:center;">${this.escapeHtml(r.promedio_general)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isLast = pageIndex === totalPages - 1;
      const bodyRows = renderRows(slice);
      const foot = isLast
        ? `
          <div class="foot">
            <div><strong>Total de registros:</strong> ${rows.length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Lic. ${this.escapeHtml(signerName)}</div>
            <div class="role">SECRETARÍA</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;
      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <img class="logo" src="${origin}/assets/Logo.png" />
          <div class="content">
            <div class="title">REPORTE DE ESTUDIANTES CON MALLA ACADÉMICA<br/>APROBADA</div>
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Estudiante</th>
                  <th style="width:28%;">Carrera</th>
                  <th style="width:22%;">Semestres aprobados</th>
                  <th style="width:18%;text-align:center;">Promedio general</th>
                </tr>
              </thead>
              <tbody>${bodyRows || `<tr><td colspan="5" style="text-align:center;">Sin registros</td></tr>`}</tbody>
            </table>
            ${foot}
          </div>
        </div>
      `;
    };

    const pagesHtml = chunks.map((slice, idx) => renderPage(slice, idx, chunks.length)).join('<div class="page-break"></div>');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page-break { page-break-after: always; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 42mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; line-height:1.3; }
        .section { margin-top: 18mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 6mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
        .foot { margin-top: 10mm; font-size: 10px; }
        .firma { margin-top: 28mm; text-align:center; font-size: 10px; }
        .firma .name { font-weight:700; }
        .firma .role { font-weight:700; letter-spacing:0.5px; }
      </style>
    </head><body>${pagesHtml}</body></html>`;

    void this.openPrintTab(html);
  }

  private printPdfRequisitos(info: { periodLabel: string }, rows: Array<{ nro: number; estudiante: string; carrera: string; estado_validacion: string }>) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();
    const pageSize = 29;
    const chunks: Array<Array<any>> = [];
    for (let i = 0; i < (rows || []).length; i += pageSize) chunks.push((rows || []).slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td>${this.escapeHtml(r.carrera)}</td>
        <td>${this.escapeHtml(r.estado_validacion)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isLast = pageIndex === totalPages - 1;
      const bodyRows = renderRows(slice);
      const foot = isLast
        ? `
          <div class="foot">
            <div><strong>Total de registros:</strong> ${rows.length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Lic. ${this.escapeHtml(signerName)}</div>
            <div class="role">SECRETARÍA</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;
      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <img class="logo" src="${origin}/assets/Logo.png" />
          <div class="content">
            <div class="title">REPORTE DE DOCUMENTOS DE REQUISITOS DEL<br/>ESTUDIANTE</div>
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Estudiante</th>
                  <th style="width:38%;">Carrera</th>
                  <th style="width:26%;">Estado de validación</th>
                </tr>
              </thead>
              <tbody>${bodyRows || `<tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>`}</tbody>
            </table>
            ${foot}
          </div>
        </div>
      `;
    };

    const pagesHtml = chunks.map((slice, idx) => renderPage(slice, idx, chunks.length)).join('<div class="page-break"></div>');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page-break { page-break-after: always; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 42mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; line-height:1.3; }
        .section { margin-top: 18mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 6mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
        .foot { margin-top: 10mm; font-size: 10px; }
        .firma { margin-top: 28mm; text-align:center; font-size: 10px; }
        .firma .name { font-weight:700; }
        .firma .role { font-weight:700; letter-spacing:0.5px; }
      </style>
    </head><body>${pagesHtml}</body></html>`;

    void this.openPrintTab(html);
  }
}
