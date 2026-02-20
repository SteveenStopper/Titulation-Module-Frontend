import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';
import { AuthService } from '../../../services/auth.service';
import { firstValueFrom, Observable, of } from 'rxjs';
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

  generalOpen = true;
  specificOpen = true;

  generalPeriodId: number | null = null;
  generalCareerId: number | null = null;

  specificPeriodId: number | null = null;
  specificCareerId: number | null = null;
  specificModalidad: 'UIC' | 'EXAMEN_COMPLEXIVO' | '' = '';

  previewGeneral: Array<{ nro: number; estudiante: string; carrera: string | null; modalidad: string }> = [];
  previewEspecifico: Array<{ nro: number; estudiante: string; carrera: string | null; modalidad: string; tutor?: string | null; tribunal?: string | null }> = [];

  previewGeneralInfo: { periodLabel: string; careerLabel: string } | null = null;
  previewEspecificoInfo: { periodLabel: string; careerLabel: string; modalidadLabel: string } | null = null;

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

    this.careers$ = this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras').pipe(
      map((arr) => {
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
        if (match?.id) {
          this.generalPeriodId = Number(match.id);
          this.specificPeriodId = Number(match.id);
        }
      });
    }
  }

  toggleGeneral() { this.generalOpen = !this.generalOpen; }
  toggleSpecific() { this.specificOpen = !this.specificOpen; }

  onChangeGeneralPeriod(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.generalPeriodId = v;
  }

  onChangeGeneralCareer(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.generalCareerId = v;
  }

  onChangeSpecificPeriod(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.specificPeriodId = v;
  }

  onChangeSpecificCareer(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.specificCareerId = v;
  }

  onChangeSpecificModalidad(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? String(select.value) : '';
    this.specificModalidad = (v === 'UIC' || v === 'EXAMEN_COMPLEXIVO') ? (v as any) : '';
  }

  limpiarGeneral() {
    this.generalCareerId = null;
    this.previewGeneral = [];
    this.previewGeneralInfo = null;
  }

  limpiarSpecific() {
    this.specificCareerId = null;
    this.specificModalidad = '';
    this.previewEspecifico = [];
    this.previewEspecificoInfo = null;
  }

  async previsualizarGeneral() {
    const pid = this.generalPeriodId;
    if (!Number.isFinite(Number(pid))) return;

    const [periods, careers] = await Promise.all([
      firstValueFrom(this.periods$),
      firstValueFrom(this.careers$),
    ]);

    const periodLabel = periods.find(p => Number(p.id) === Number(pid))?.name || '';
    const careerLabel = Number.isFinite(Number(this.generalCareerId))
      ? (careers.find(c => Number(c.id) === Number(this.generalCareerId))?.nombre || '')
      : 'Todas';

    const params = new URLSearchParams();
    params.set('academicPeriodId', String(pid));
    if (Number.isFinite(Number(this.generalCareerId))) params.set('careerId', String(this.generalCareerId));

    const list = await firstValueFrom(
      this.http.get<any[]>(`/api/uic/admin/reportes/general?${params.toString()}`).pipe(
        catchError(() => of([] as any[]))
      )
    );

    this.previewGeneral = (Array.isArray(list) ? list : []).map((r, idx) => ({
      nro: idx + 1,
      estudiante: String(r?.estudiante || r?.fullname || ''),
      carrera: r?.carrera != null ? String(r.carrera) : (r?.career_name != null ? String(r.career_name) : null),
      modalidad: String(r?.modalidad || ''),
    }));
    this.previewGeneralInfo = { periodLabel, careerLabel };
  }

  async generarPdfGeneral() {
    if (!this.previewGeneralInfo) return;
    if (!Array.isArray(this.previewGeneral)) return;
    this.printReporteGeneral(this.previewGeneralInfo, this.previewGeneral);
  }

  async previsualizarEspecifico() {
    const pid = this.specificPeriodId;
    if (!Number.isFinite(Number(pid))) return;
    if (!this.specificModalidad) return;

    const [periods, careers] = await Promise.all([
      firstValueFrom(this.periods$),
      firstValueFrom(this.careers$),
    ]);

    const periodLabel = periods.find(p => Number(p.id) === Number(pid))?.name || '';
    const careerLabel = Number.isFinite(Number(this.specificCareerId))
      ? (careers.find(c => Number(c.id) === Number(this.specificCareerId))?.nombre || '')
      : 'Todas';
    const modalidadLabel = this.specificModalidad === 'UIC' ? 'UIC' : 'Examen Complexivo';

    const params = new URLSearchParams();
    params.set('academicPeriodId', String(pid));
    params.set('modalidad', String(this.specificModalidad));
    if (Number.isFinite(Number(this.specificCareerId))) params.set('careerId', String(this.specificCareerId));

    const list = await firstValueFrom(
      this.http.get<any[]>(`/api/uic/admin/reportes/especifico?${params.toString()}`).pipe(
        catchError(() => of([] as any[]))
      )
    );

    this.previewEspecifico = (Array.isArray(list) ? list : []).map((r, idx) => ({
      nro: idx + 1,
      estudiante: String(r?.estudiante || r?.fullname || ''),
      carrera: r?.carrera != null ? String(r.carrera) : (r?.career_name != null ? String(r.career_name) : null),
      modalidad: String(r?.modalidad || modalidadLabel),
      tutor: r?.tutor != null ? String(r.tutor) : (r?.tutor_name != null ? String(r.tutor_name) : null),
      tribunal: r?.tribunal != null ? String(r.tribunal) : null,
    }));

    this.previewEspecificoInfo = { periodLabel, careerLabel, modalidadLabel };
  }

  async generarPdfEspecifico() {
    if (!this.previewEspecificoInfo) return;
    if (!Array.isArray(this.previewEspecifico)) return;
    this.printReporteEspecifico(this.previewEspecificoInfo, this.previewEspecifico);
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

      const waitForImages = () => {
        const imgs = Array.from(w.document.images || []);
        if (!imgs.length) return Promise.resolve();
        return Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if ((img as HTMLImageElement).complete) return resolve();
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              })
          )
        ).then(() => undefined);
      };

      await waitForImages();
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

  private printReporteGeneral(info: { periodLabel: string; careerLabel: string }, rows: Array<{ nro: number; estudiante: string; carrera: string | null; modalidad: string }>) {
    const origin = window.location.origin;
    const ts = new Date();
    const fecha = this.formatLongDate(ts);
    const signerName = this.getSignerFullName();

    const bodyRows = rows.map(r => `
      <tr>
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td>${this.escapeHtml(r.carrera || '')}</td>
        <td>${this.escapeHtml(r.modalidad || '')}</td>
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
        .meta { margin-top: 14mm; font-size: 11px; font-weight:700; }
        .section { margin-top: 18mm; font-size: 11px; font-weight:700; }
        table { width:100%; border-collapse: collapse; margin-top: 6mm; font-size: 10px; }
        th, td { border: 1px solid #111; padding: 6px; }
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
          <div class="title">REPORTE DE ESTUDIANTES EN PROCESO DE TITULACIÓN</div>
          <div class="meta">PERIODO ACADÉMICO: <span style="font-weight:500;">${this.escapeHtml(info.periodLabel || '')}</span></div>
          <table>
            <thead>
              <tr>
                <th style="width:36px;text-align:center;">N°</th>
                <th>Estudiante</th>
                <th style="width:38%;">Carrera</th>
                <th style="width:22%;">Modalidad</th>
              </tr>
            </thead>
            <tbody>
              ${bodyRows || `<tr><td colspan="4" style="text-align:center;">Sin registros</td></tr>`}
            </tbody>
          </table>
          <div class="foot">
            <div><strong>Total de registros:</strong> ${rows.length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}, Ph.D.</div>
            <div class="role">COORDINADOR</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        </div>
      </div>
    </body></html>`;

    void this.openPrintTab(html);
  }

  private printReporteEspecifico(
    info: { periodLabel: string; careerLabel: string; modalidadLabel: string },
    rows: Array<{ nro: number; estudiante: string; carrera: string | null; modalidad: string; tutor?: string | null; tribunal?: string | null }>
  ) {
    const origin = window.location.origin;
    const ts = new Date();
    const fecha = this.formatLongDate(ts);
    const signerName = this.getSignerFullName();

    const isUic = String(info.modalidadLabel) === 'UIC';
    const titulo = isUic
      ? 'REPORTE DE ESTUDIANTES CON TUTOR Y TRIBUNAL\nASIGNADO'
      : 'REPORTE DE ESTUDIANTES EN EXAMEN COMPLEXIVO';

    const bodyRows = rows.map(r => {
      const common = `
        <td style="width:36px;text-align:center;">${r.nro}</td>
        <td>${this.escapeHtml(r.estudiante)}</td>
        <td>${this.escapeHtml(r.carrera || '')}</td>
        <td>${this.escapeHtml(r.modalidad || '')}</td>
      `;
      const extra = isUic
        ? `<td>${this.escapeHtml(r.tutor || '')}</td><td>${this.escapeHtml(r.tribunal || '')}</td>`
        : '';
      return `<tr>${common}${extra}</tr>`;
    }).join('');

    const headCols = isUic
      ? `<tr>
          <th style="width:36px;text-align:center;">N°</th>
          <th>Estudiante</th>
          <th style="width:24%;">Carrera</th>
          <th style="width:14%;">Modalidad</th>
          <th style="width:16%;">Tutor</th>
          <th style="width:16%;">Tribunal</th>
        </tr>`
      : `<tr>
          <th style="width:36px;text-align:center;">N°</th>
          <th>Estudiante</th>
          <th style="width:38%;">Carrera</th>
          <th style="width:22%;">Modalidad</th>
        </tr>`;

    const colSpan = isUic ? 6 : 4;

    const html = `<!doctype html><html><head><meta charset="utf-8">
      <style>
        @page { margin: 0; }
        body { margin: 0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page { position: relative; width: 210mm; height: 297mm; }
        .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .logo { position:absolute; top: 16mm; left: 18mm; height: 18mm; width: auto; }
        .content { position: relative; padding: 32mm 18mm 22mm 18mm; }
        .title { text-align:center; font-weight:700; font-size:14px; margin-top: 10mm; white-space: pre-line; }
        .meta { margin-top: 14mm; font-size: 11px; font-weight:700; }
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
          <div class="title">${titulo}</div>
          <div class="meta">PERIODO ACADÉMICO: <span style="font-weight:500;">${this.escapeHtml(info.periodLabel || '')}</span></div>
          <table>
            <thead>${headCols}</thead>
            <tbody>${bodyRows || `<tr><td colspan="${colSpan}" style="text-align:center;">Sin registros</td></tr>`}</tbody>
          </table>
          <div class="foot">
            <div><strong>Total de registros:</strong> ${rows.length}</div>
            <div style="margin-top:4mm;font-weight:500;">${this.escapeHtml(fecha)}</div>
          </div>
          <div class="firma">
            <div class="name">Ing. ${this.escapeHtml(signerName)}, Ph.D.</div>
            <div class="role">COORDINADOR</div>
            <div class="role">INSTITUTO SUPERIOR TECNOLÓGICO LOS ANDES</div>
          </div>
        </div>
      </div>
    </body></html>`;

    void this.openPrintTab(html);
  }

  private escapeHtml(s: string) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
