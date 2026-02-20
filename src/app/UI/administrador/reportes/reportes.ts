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
  reportType: 'PERIODOS' | 'GENERAL' | '' = '';

  previewPeriodos: Array<{ nro: number; nombre: string; fecha_inicio: string; fecha_fin: string; estado: string }> = [];
  previewGeneral: { estudiantes_en_proceso: number; modalidad_uic: number; modalidad_examen_complexivo: number } | null = null;

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
    this.previewPeriodos = [];
    this.previewGeneral = null;
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

  private escapeHtml(s: string) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private fmtDateCell(d: any) {
    const dt = d ? new Date(d) : null;
    if (!dt || Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('es-EC');
  }

  async previsualizar() {
    if (!this.reportType) return;
    const [periods] = await Promise.all([firstValueFrom(this.periods$)]);

    const periodLabel = this.selectedPeriodId
      ? (periods.find(p => Number(p.id) === Number(this.selectedPeriodId))?.name || '')
      : 'Periodo Activo';
    this.previewInfo = { periodLabel };

    if (this.reportType === 'PERIODOS') {
      const list = await firstValueFrom(this.http.get<any[]>(`/api/uic/admin/reportes/admin/periodos`).pipe(catchError(() => of([] as any[]))));
      this.previewPeriodos = (Array.isArray(list) ? list : []).map((r, idx) => ({
        nro: idx + 1,
        nombre: String(r?.nombre || ''),
        fecha_inicio: this.fmtDateCell(r?.fecha_inicio),
        fecha_fin: this.fmtDateCell(r?.fecha_fin),
        estado: String(r?.estado || ''),
      }));
      this.previewGeneral = null;
      return;
    }

    const params = new URLSearchParams();
    if (this.selectedPeriodId) params.set('academicPeriodId', String(this.selectedPeriodId));
    const gen = await firstValueFrom(this.http.get<any>(`/api/uic/admin/reportes/admin/general?${params.toString()}`).pipe(catchError(() => of(null))));
    this.previewGeneral = gen ? {
      estudiantes_en_proceso: Number(gen?.estudiantes_en_proceso || 0),
      modalidad_uic: Number(gen?.modalidad_uic || 0),
      modalidad_examen_complexivo: Number(gen?.modalidad_examen_complexivo || 0),
    } : { estudiantes_en_proceso: 0, modalidad_uic: 0, modalidad_examen_complexivo: 0 };
    this.previewPeriodos = [];
  }

  generarPdf() {
    if (!this.previewInfo || !this.reportType) return;
    if (this.reportType === 'PERIODOS') return void this.printPdfPeriodos(this.previewInfo, this.previewPeriodos);
    return void this.printPdfGeneral(this.previewInfo, this.previewGeneral);
  }

  private printPdfPeriodos(info: { periodLabel: string }, rows: Array<{ nro: number; nombre: string; fecha_inicio: string; fecha_fin: string; estado: string }>) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();

    const bodyRows = (rows || []).map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.nombre)}</td>
        <td>${this.escapeHtml(r.fecha_inicio)}</td>
        <td>${this.escapeHtml(r.fecha_fin)}</td>
        <td>${this.escapeHtml(r.estado)}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 22mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; }
        .section { margin-top: 18mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 6mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
        .foot { margin-top: 10mm; font-size: 10px; }
        .firma { margin-top: 34mm; text-align:center; font-size: 10px; }
        .firma .name { font-weight:700; }
        .firma .role { font-weight:700; letter-spacing:0.5px; }
      </style>
    </head><body>
      <div class="page">
        <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
        <img class="logo" src="${origin}/assets/Logo.png" />
        <div class="content">
          <div class="title">REPORTE DE PERIODOS ACADÉMICOS REGISTRADOS</div>
          <table>
            <thead>
              <tr>
                <th style="width:36px;text-align:center;">N°</th>
                <th>Periodo Académico</th>
                <th style="width:22%;">Fecha Inicio</th>
                <th style="width:22%;">Fecha Fin</th>
                <th style="width:18%;">Estado</th>
              </tr>
            </thead>
            <tbody>${bodyRows || `<tr><td colspan="5" style="text-align:center;">Sin registros</td></tr>`}</tbody>
          </table>
          <div class="foot">
            <div><strong>Total de registros:</strong> ${rows.length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}, Ph.D.</div>
            <div class="role">ADMINISTRADOR DEL SISTEMA DE TITULACIÓN</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        </div>
      </div>
    </body></html>`;

    void this.openPrintTab(html);
  }

  private printPdfUsuarios(info: { periodLabel: string }, rows: Array<{ nro: number; usuario: string; rol: string | null; estado: string }>) {
    const origin = window.location.origin;

    const pageSize = 29;
    const chunks: Array<Array<{ nro: number; usuario: string; rol: string | null; estado: string }>> = [];
    for (let i = 0; i < (rows || []).length; i += pageSize) chunks.push((rows || []).slice(i, i + pageSize));
    if (!chunks.length) chunks.push([]);

    const renderRows = (slice: Array<{ nro: number; usuario: string; rol: string | null; estado: string }>) =>
      (slice || []).map(r => `
        <tr>
          <td style="width:36px;text-align:center;">${r.nro}</td>
          <td>${this.escapeHtml(r.usuario)}</td>
          <td>${this.escapeHtml(r.rol || '')}</td>
          <td>${this.escapeHtml(r.estado)}</td>
        </tr>
      `).join('');

    const renderPage = (slice: Array<{ nro: number; usuario: string; rol: string | null; estado: string }>, pageIndex: number, totalPages: number) => {
      const bodyRows = renderRows(slice);
      const isFirst = pageIndex === 0;

      return `
        <div class="page">
          <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
          <img class="logo" src="${origin}/assets/Logo.png" />
          <div class="content" style="${isFirst ? '' : 'padding-top: 18mm;'}">
            ${isFirst ? `<div class="title">REPORTE DE USUARIOS DEL SISTEMA</div>` : `<div style="height:18mm;"></div>`}
            <table>
              <thead>
                <tr>
                  <th style="width:36px;text-align:center;">N°</th>
                  <th>Usuario</th>
                  <th style="width:28%;">Rol</th>
                  <th style="width:20%;">Estado</th>
                </tr>
              </thead>
              <tbody>${bodyRows || `<tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      `;
    };

    const pagesHtml = chunks
      .map((slice, idx) => renderPage(slice, idx, chunks.length))
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 38mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 6mm; }
        .section { margin-top: 10mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 4mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
      </style>
    </head><body>${pagesHtml}</body></html>`;

    void this.openPrintTab(html);
  }

  private printPdfGeneral(info: { periodLabel: string }, gen: { estudiantes_en_proceso: number; modalidad_uic: number; modalidad_examen_complexivo: number } | null) {
    const origin = window.location.origin;
    const fecha = this.formatLongDate(new Date());
    const signerName = this.getSignerFullName();
    const g = gen || { estudiantes_en_proceso: 0, modalidad_uic: 0, modalidad_examen_complexivo: 0 };

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 22mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; }
        .lead { margin-top: 18mm; font-size: 10.5px; line-height: 1.5; }
        .meta { margin-top: 12mm; font-size: 11px; font-weight:700; }
        table { width:70%; border-collapse: collapse; margin-top: 4mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; vertical-align: top; }
        th { text-align:left; font-weight:700; }
        .foot { margin-top: 14mm; font-size: 10px; }
        .firma { margin-top: 34mm; text-align:center; font-size: 10px; }
        .firma .name { font-weight:700; }
        .firma .role { font-weight:700; letter-spacing:0.5px; }
      </style>
    </head><body>
      <div class="page">
        <img class="bg" src="${origin}/assets/Fondo_doc.jpg" />
        <img class="logo" src="${origin}/assets/Logo.png" />
        <div class="content">
          <div class="title">REPORTE GENERAL DEL SISTEMA</div>
          <div class="meta">PERIODO ACADÉMICO: <span style="font-weight:500;">${this.escapeHtml(info.periodLabel || '')}</span></div>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th style="width:28%;text-align:center;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Estudiantes en proceso de titulación</td><td style="text-align:center;">${Number(g.estudiantes_en_proceso || 0)}</td></tr>
              <tr><td>Modalidad UIC</td><td style="text-align:center;">${Number(g.modalidad_uic || 0)}</td></tr>
              <tr><td>Modalidad Examen Complexivo</td><td style="text-align:center;">${Number(g.modalidad_examen_complexivo || 0)}</td></tr>
            </tbody>
          </table>
          <div class="foot">
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}, Ph.D.</div>
            <div class="role">ADMINISTRADOR DEL SISTEMA DE TITULACIÓN</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        </div>
      </div>
    </body></html>`;

    void this.openPrintTab(html);
  }
}
