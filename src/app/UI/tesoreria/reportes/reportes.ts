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
  careers$!: Observable<Array<{ id: number; nombre: string }>>;
  filtersOpen = true;

  selectedPeriodId: number | null = null;
  selectedCareerId: number | null = null;
  reportType: 'ARANCELES' | 'COMPROBANTES' | '' = '';

  previewInfo: { periodLabel: string; careerLabel: string } | null = null;

  previewComprobantes: Array<{
    nro: number;
    estudiante: string;
    carrera: string;
    comprobante_certificados: string;
    comprobante_titulacion: string;
    comprobante_acta_grado: string;
  }> = [];

  previewAranceles: Array<{
    nro: number;
    estudiante: string;
    carrera: string;
    estado_aranceles: string;
  }> = [];

  constructor(private http: HttpClient, private periodSvc: PeriodService, private auth: AuthService) {
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: Number(p.id_academic_periods), name: String(p.name) }))),
      catchError(() => of([] as Array<{ id: number; name: string }>)),
      shareReplay(1)
    );
    const normalizeText = (s: string) => String(s || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');

    this.careers$ = this.http.get<any[]>('/api/tesoreria/carreras').pipe(
      map((arr: any[]) => {
        const seen = new Set<string>();
        const out: Array<{ id: number; nombre: string }> = [];
        for (const c of Array.isArray(arr) ? arr : []) {
          const id = Number((c as any)?.id);
          const nombre = String((c as any)?.nombre || '');
          if (!Number.isFinite(id) || !nombre.trim()) continue;
          const keyName = normalizeText(nombre);
          if (!keyName.includes('TECNOLOGIA')) continue;
          if (seen.has(keyName)) continue;
          seen.add(keyName);
          out.push({ id, nombre });
        }
        return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
      }),
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
    this.previewComprobantes = [];
    this.previewAranceles = [];
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

  private titleCaseName(s: string): string {
    const str = String(s || '').trim();
    if (!str) return '';
    return str
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean)
      .map(w => w.length ? (w[0].toUpperCase() + w.slice(1)) : '')
      .join(' ');
  }

  private normalizeEstado(s: any) {
    const v = String(s || '').toLowerCase();
    if (!v) return 'Sin comprobante';
    if (v === 'aprobado') return 'Aprobado';
    if (v === 'rechazado') return 'Rechazado';
    if (v === 'en_revision') return 'En revisión';
    return String(s);
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

  async previsualizar() {
    if (!this.selectedPeriodId || !this.reportType) return;
    const periods = await firstValueFrom(this.periods$);
    const careers = await firstValueFrom(this.careers$);
    const perLabel = (periods || []).find(p => Number(p.id) === Number(this.selectedPeriodId))?.name || '';
    const carLabel = !this.selectedCareerId
      ? 'Todas las carreras'
      : (careers || []).find(c => Number(c.id) === Number(this.selectedCareerId))?.nombre || '';

    this.previewInfo = { periodLabel: perLabel, careerLabel: carLabel };
    this.previewComprobantes = [];
    this.previewAranceles = [];

    if (this.reportType === 'COMPROBANTES') {
      const q = new URLSearchParams();
      q.set('academicPeriodId', String(this.selectedPeriodId));
      if (this.selectedCareerId) q.set('careerId', String(this.selectedCareerId));
      const resp = await firstValueFrom(this.http.get<any>(`/api/tesoreria/reportes/comprobantes?${q.toString()}`).pipe(catchError(() => of({ data: [] }))));
      const data = Array.isArray(resp?.data) ? resp.data : [];
      this.previewComprobantes = data.map((r: any) => ({
        nro: Number(r?.nro || 0),
        estudiante: this.titleCaseName(String(r?.estudiante || '').trim()),
        carrera: String(r?.carrera || '').trim(),
        comprobante_certificados: this.normalizeEstado(r?.comprobante_certificados),
        comprobante_titulacion: this.normalizeEstado(r?.comprobante_titulacion),
        comprobante_acta_grado: this.normalizeEstado(r?.comprobante_acta_grado),
      }));
    }

    if (this.reportType === 'ARANCELES') {
      const q = new URLSearchParams();
      q.set('academicPeriodId', String(this.selectedPeriodId));
      if (this.selectedCareerId) q.set('careerId', String(this.selectedCareerId));
      const resp = await firstValueFrom(this.http.get<any>(`/api/tesoreria/reportes/aranceles?${q.toString()}`).pipe(catchError(() => of({ data: [] }))));
      const data = Array.isArray(resp?.data) ? resp.data : [];
      this.previewAranceles = data.map((r: any) => ({
        nro: Number(r?.nro || 0),
        estudiante: this.titleCaseName(String(r?.estudiante || '').trim()),
        carrera: String(r?.carrera || '').trim(),
        estado_aranceles: String(r?.estado_aranceles || '').trim() || 'Inactivo',
      }));
    }
  }

  async generarPdf() {
    if (!this.previewInfo || !this.reportType) return;
    if (this.reportType === 'COMPROBANTES') {
      this.printPdfComprobantes(this.previewInfo, this.previewComprobantes);
    }
    if (this.reportType === 'ARANCELES') {
      this.printPdfAranceles(this.previewInfo, this.previewAranceles);
    }
  }

  private printPdfAranceles(info: { periodLabel: string; careerLabel: string }, rows: any[]) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();

    const firstPageSize = 24;
    const otherPageSize = 21;
    const chunks: Array<any[]> = [];
    const allRows = Array.isArray(rows) ? rows : [];
    if (allRows.length) {
      chunks.push(allRows.slice(0, firstPageSize));
      for (let i = firstPageSize; i < allRows.length; i += otherPageSize) chunks.push(allRows.slice(i, i + otherPageSize));
    }
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td style="width:32%;">${this.escapeHtml(r.carrera)}</td>
        <td style="width:20%;text-align:center;">${this.escapeHtml(r.estado_aranceles)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isFirst = pageIndex === 0;
      const isLast = pageIndex === totalPages - 1;
      const bodyRows = renderRows(slice);
      const foot = isLast
        ? `
          <div class="foot">
            <div><strong>Total de registros:</strong> ${(rows || []).length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">${this.escapeHtml(signerName)}</div>
            <div class="role">TESORERÍA</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;

      const header = isFirst
        ? `
            <img class="logo" src="${origin}/assets/Logo.png" />
            <div class="title">REPORTE DE ESTADO DE ARANCELES DE ESTUDIANTES</div>
            <div class="meta"><strong>PERIODO ACADEMICO:</strong> ${this.escapeHtml(info.periodLabel)}</div>
        `
        : '';

      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <div class="content ${isFirst ? 'with-header' : 'no-header'}">
            ${header}
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Estudiante</th>
                  <th style="width:32%;">Carrera</th>
                  <th style="width:20%;text-align:center;">Estado del arancel</th>
                </tr>
              </thead>
              <tbody>${bodyRows || `<tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>`}</tbody>
            </table>
            ${foot}
          </div>
        </div>
      `;
    };

    const pagesHtml = chunks.map((slice, idx) => renderPage(slice, idx, chunks.length)).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page-break { page-break-after: always; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 18mm 18mm 42mm 18mm; }
        .content.with-header { padding-top: 44mm; }
        .content.no-header { padding-top: 34mm; padding-bottom: 54mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; line-height:1.3; }
        .meta { margin-top: 10mm; font-size: 10.5px; font-weight: 500; }
        .section { margin-top: 14mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 6mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
        .foot { margin-top: 10mm; font-size: 10px; }
        .firma { margin-top: 22mm; text-align:center; font-size: 10px; }
        .firma .name { font-weight:700; }
        .firma .role { font-weight:700; letter-spacing:0.5px; }
      </style>
    </head><body>${pagesHtml}</body></html>`;

    void this.openPrintTab(html);
  }

  private printPdfComprobantes(info: { periodLabel: string; careerLabel: string }, rows: any[]) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();

    const firstPageSize = 18;
    const otherPageSize = 14;
    const chunks: Array<any[]> = [];
    const allRows = Array.isArray(rows) ? rows : [];
    if (allRows.length) {
      chunks.push(allRows.slice(0, firstPageSize));
      for (let i = firstPageSize; i < allRows.length; i += otherPageSize) chunks.push(allRows.slice(i, i + otherPageSize));
    }
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: any[]) => (slice || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td style="width:22%;">${this.escapeHtml(r.carrera)}</td>
        <td style="width:14%;text-align:center;">${this.escapeHtml(r.comprobante_certificados)}</td>
        <td style="width:14%;text-align:center;">${this.escapeHtml(r.comprobante_titulacion)}</td>
        <td style="width:14%;text-align:center;">${this.escapeHtml(r.comprobante_acta_grado)}</td>
      </tr>
    `).join('');

    const renderPage = (slice: any[], pageIndex: number, totalPages: number) => {
      const isFirst = pageIndex === 0;
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
            <div class="role">TESORERÍA</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        `
        : `<div style="height:44mm;"></div>`;
      const header = isFirst
        ? `
            <img class="logo" src="${origin}/assets/Logo.png" />
            <div class="title">REPORTE DE COMPROBANTES DE PAGO</div>
            <div class="meta"><strong>PERIODO ACADÉMICO:</strong> ${this.escapeHtml(info.periodLabel)}</div>
            <div class="meta"><strong>CARRERA:</strong> ${this.escapeHtml(info.careerLabel || 'Todas')}</div>
        `
        : '';

      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <div class="content ${isFirst ? 'with-header' : 'no-header'}">
            ${header}
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Estudiante</th>
                  <th style="width:22%;">Carrera</th>
                  <th style="width:14%;text-align:center;">Certificados</th>
                  <th style="width:14%;text-align:center;">Titulación</th>
                  <th style="width:14%;text-align:center;">Acta de grado</th>
                </tr>
              </thead>
              <tbody>${bodyRows || `<tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>`}</tbody>
            </table>
            ${foot}
          </div>
        </div>
      `;
    };

    const pagesHtml = chunks.map((slice, idx) => renderPage(slice, idx, chunks.length)).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .page-break { page-break-after: always; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 18mm 18mm 42mm 18mm; }
        .content.with-header { padding-top: 44mm; }
        .content.no-header { padding-top: 34mm; padding-bottom: 54mm; }
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
