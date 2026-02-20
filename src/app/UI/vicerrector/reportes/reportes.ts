import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';
import { AuthService } from '../../../services/auth.service';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  periods$!: Observable<Array<{ id: number; name: string }>>;
  careers$!: Observable<Array<{ id: number; nombre: string }>>;
  filtersOpen = true;

  selectedPeriodId: number | null = null;
  selectedCareerId: number | null = null;
  reportType: 'MATERIAS' | 'DOCENTES' | '' = '';

  previewInfo: { periodLabel: string; careerLabel: string } | null = null;
  previewMaterias: Array<{ nro: number; materia: string; carrera: string; estado: string }> = [];
  previewDocentes: Array<{ nro: number; docente: string; materia: string; carrera: string; estado: string }> = [];

  constructor(private http: HttpClient, private periodSvc: PeriodService, private auth: AuthService) {
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: Number(p.id_academic_periods), name: String(p.name) }))),
      catchError(() => of([] as Array<{ id: number; name: string }>)),
      shareReplay(1)
    );
    this.careers$ = this.http.get<any[]>('/api/vicerrector/carreras').pipe(
      map((arr: any[]) => (arr || []).map((c: any) => ({ id: Number(c.id), nombre: String(c.nombre) }))),
      catchError(() => of([] as Array<{ id: number; nombre: string }>)),
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
    this.selectedCareerId = null;
    this.previewInfo = null;
    this.previewMaterias = [];
    this.previewDocentes = [];
  }

  private getSignerFullName() {
    const u = this.auth.currentUserValue as any;
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
      // noop
    }
  }

  async previsualizar() {
    if (!this.selectedPeriodId || !this.reportType) return;
    const periods = await firstValueFrom(this.periods$);
    const careers = await firstValueFrom(this.careers$);
    const perLabel = (periods || []).find(p => Number(p.id) === Number(this.selectedPeriodId))?.name || '';
    const carLabel = !this.selectedCareerId
      ? 'Todas las carreras'
      : (careers || []).find(c => Number(c.id) === Number(this.selectedCareerId))?.nombre || '';

    this.previewInfo = { periodLabel: perLabel, careerLabel: carLabel };
    this.previewMaterias = [];
    this.previewDocentes = [];

    const q = new URLSearchParams();
    q.set('academicPeriodId', String(this.selectedPeriodId));
    if (this.selectedCareerId) q.set('careerId', String(this.selectedCareerId));

    if (this.reportType === 'MATERIAS') {
      const resp = await firstValueFrom(this.http.get<any>(`/api/vicerrector/reportes/complexivo-materias?${q.toString()}`).pipe(catchError(() => of({ data: [] }))));
      const data = Array.isArray(resp?.data) ? resp.data : [];
      this.previewMaterias = data.map((r: any) => ({
        nro: Number(r?.nro || 0),
        materia: String(r?.materia || '').trim(),
        carrera: String(r?.carrera || '').trim(),
        estado: String(r?.estado || '').trim(),
      }));
    }

    if (this.reportType === 'DOCENTES') {
      const resp = await firstValueFrom(this.http.get<any>(`/api/vicerrector/reportes/complexivo-docentes?${q.toString()}`).pipe(catchError(() => of({ data: [] }))));
      const data = Array.isArray(resp?.data) ? resp.data : [];
      this.previewDocentes = data.map((r: any) => ({
        nro: Number(r?.nro || 0),
        docente: String(r?.docente || '').trim(),
        materia: String(r?.materia || '').trim(),
        carrera: String(r?.carrera || '').trim(),
        estado: String(r?.estado || '').trim(),
      }));
    }
  }

  async generarPdf() {
    if (!this.previewInfo || !this.reportType) return;
    if (this.reportType === 'MATERIAS') this.printPdfMaterias(this.previewInfo, this.previewMaterias);
    if (this.reportType === 'DOCENTES') this.printPdfDocentes(this.previewInfo, this.previewDocentes);
  }

  private printPdfMaterias(info: { periodLabel: string; careerLabel: string }, rows: any[]) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();
    const pageSize = 29;
    const chunks: Array<any[]> = [];
    for (let i = 0; i < (rows || []).length; i += pageSize) chunks.push((rows || []).slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.materia)}</td>
        <td style="width:32%;">${this.escapeHtml(r.carrera)}</td>
        <td style="width:18%;text-align:center;">${this.escapeHtml(r.estado)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isLast = pageIndex === totalPages - 1;
      const bodyRows = renderRows(slice);
      const foot = isLast
        ? `
          <div class="foot">
            <div><strong>Total de registros:</strong> ${(rows || []).length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}</div>
            <div class="role">VICERRECTOR</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;

      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <img class="logo" src="${origin}/assets/Logo.png" />
          <div class="content">
            <div class="title">REPORTE DE MATERIAS ASIGNADAS PARA EXAMEN<br/>COMPLEXIVO</div>
            <div class="meta"><strong>PERIODO ACADEMICO:</strong> ${this.escapeHtml(info.periodLabel)}</div>
            <div class="meta"><strong>CARRERA:</strong> ${this.escapeHtml(info.careerLabel || 'Todas')}</div>
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Materias</th>
                  <th style="width:32%;">Carrera</th>
                  <th style="width:18%;text-align:center;">Estado</th>
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
        .meta { margin-top: 6mm; font-size: 10.5px; font-weight: 500; }
        .section { margin-top: 10mm; font-size: 11px; font-weight:700; }
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

  private printPdfDocentes(info: { periodLabel: string; careerLabel: string }, rows: any[]) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();
    const pageSize = 29;
    const chunks: Array<any[]> = [];
    for (let i = 0; i < (rows || []).length; i += pageSize) chunks.push((rows || []).slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td style="width:28%;">${this.escapeHtml(r.docente)}</td>
        <td>${this.escapeHtml(r.materia)}</td>
        <td style="width:22%;">${this.escapeHtml(r.carrera)}</td>
        <td style="width:16%;text-align:center;">${this.escapeHtml(r.estado)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isLast = pageIndex === totalPages - 1;
      const bodyRows = renderRows(slice);
      const foot = isLast
        ? `
          <div class="foot">
            <div><strong>Total de registros:</strong> ${(rows || []).length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}</div>
            <div class="role">VICERRECTOR</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;

      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <img class="logo" src="${origin}/assets/Logo.png" />
          <div class="content">
            <div class="title">REPORTE DE DOCENTES ASIGNADOS A EXAMEN<br/>COMPLEXIVO</div>
            <div class="meta"><strong>PERIODO ACADEMICO:</strong> ${this.escapeHtml(info.periodLabel)}</div>
            <div class="meta"><strong>CARRERA:</strong> ${this.escapeHtml(info.careerLabel || 'Todas')}</div>
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th style="width:28%;">Docente</th>
                  <th>Materia</th>
                  <th style="width:22%;">Carrera</th>
                  <th style="width:16%;text-align:center;">Estado</th>
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
        .meta { margin-top: 6mm; font-size: 10.5px; font-weight: 500; }
        .section { margin-top: 10mm; font-size: 11px; font-weight:700; }
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
