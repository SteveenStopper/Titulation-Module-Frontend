import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';
import { BehaviorSubject, Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators';

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

  selectedPeriodId$ = new BehaviorSubject<number | null>(null);
  selectedCareerId$ = new BehaviorSubject<number | null>(null);

  dash$!: Observable<{ totalEnProceso: number; sinTutor: number; totalEstudiantes: number; uicPercent: number; complexivoPercent: number }>;
  sinTutor$!: Observable<Array<{ id_user: number; fullname: string; career_id: number | null; career_name: string | null; suggested_tutor: string | null }>>;
  conTutor$!: Observable<Array<{ id_user: number; fullname: string; career_id: number | null; career_name: string | null; tutor_id: number | null; tutor_name: string | null }>>;

  today = new Date();

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: Number(p.id_academic_periods), name: String(p.name) }))),
      catchError(() => of([] as Array<{ id: number; name: string }>)),
      shareReplay(1)
    );

    this.careers$ = this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras').pipe(
      catchError(() => of([] as Array<{ id: number; nombre: string }>)),
      shareReplay(1)
    );

    const activeName = this.periodSvc.getActivePeriod();
    if (activeName && typeof activeName === 'string') {
      this.periods$.subscribe((rows) => {
        const match = (rows || []).find(r => r.name === activeName);
        if (match?.id) this.selectedPeriodId$.next(Number(match.id));
      });
    }

    this.dash$ = this.selectedPeriodId$.pipe(
      switchMap((pid) => this.http.get<any>(`/api/uic/admin/dashboard${pid ? `?academicPeriodId=${pid}` : ''}`).pipe(
        map((d) => ({
          totalEnProceso: Number(d?.totalEnProceso || 0),
          sinTutor: Number(d?.sinTutor || 0),
          totalEstudiantes: Number(d?.totalEstudiantes || 0),
          uicPercent: Number(d?.uicPercent || 0),
          complexivoPercent: Number(d?.complexivoPercent || 0),
        })),
        catchError(() => of({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 }))
      )),
      startWith({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 }),
      shareReplay(1)
    );

    this.sinTutor$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
      switchMap(([pid, cid]) => this.http.get<any[]>(`/api/uic/admin/estudiantes-sin-tutor${this.buildQuery({ academicPeriodId: pid, careerId: cid })}`).pipe(
        map(list => (Array.isArray(list) ? list : [])),
        catchError(() => of([]))
      )),
      startWith([] as any[]),
      shareReplay(1)
    );

    this.conTutor$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
      switchMap(([pid, cid]) => this.http.get<any[]>(`/api/uic/admin/estudiantes-con-tutor${this.buildQuery({ academicPeriodId: pid, careerId: cid })}`).pipe(
        map(list => (Array.isArray(list) ? list : [])),
        catchError(() => of([]))
      )),
      startWith([] as any[]),
      shareReplay(1)
    );
  }

  onChangePeriod(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.selectedPeriodId$.next(v);
  }

  onChangeCareer(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : null;
    this.selectedCareerId$.next(v);
  }

  private buildQuery(params: { [k: string]: any }) {
    const qp = Object.entries(params)
      .filter(([, val]) => val !== null && val !== undefined && val !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return qp ? `?${qp}` : '';
  }

  // Exportaciones
  async exportKpisCsv() {
    const dash = await firstValueFrom(this.dash$);
    const rows: (string | number)[][] = [
      ['KPI', 'Valor'],
      ['Total en proceso', dash.totalEnProceso],
      ['Sin tutor (UIC)', dash.sinTutor],
      ['Total estudiantes (período)', dash.totalEstudiantes],
      ['UIC %', dash.uicPercent],
      ['Examen Complexivo %', dash.complexivoPercent],
    ];
    this.downloadCsv(rows, 'coordinador-kpis.csv');
  }

  async exportDetalleCsv() {
    const [sinTutor, conTutor] = await Promise.all([
      firstValueFrom(this.sinTutor$),
      firstValueFrom(this.conTutor$)
    ]);
    const rows: (string | number)[][] = [
      ['Tipo', 'Estudiante', 'Carrera', 'Tutor'],
      ...sinTutor.map(r => ['Sin tutor', r.fullname, r.career_name || '', r.suggested_tutor || '']),
      ...conTutor.map(r => ['Con tutor', r.fullname, r.career_name || '', r.tutor_name || '']),
    ];
    this.downloadCsv(rows, 'coordinador-detalle-estudiantes.csv');
  }

  async printPdf() {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;

    const [periods, careers, pid, cid, dash, sinTutor, conTutor] = await Promise.all([
      firstValueFrom(this.periods$),
      firstValueFrom(this.careers$),
      firstValueFrom(this.selectedPeriodId$),
      firstValueFrom(this.selectedCareerId$),
      firstValueFrom(this.dash$),
      firstValueFrom(this.sinTutor$),
      firstValueFrom(this.conTutor$),
    ]);

    const origin = window.location.origin;
    const periodLabel = pid ? (periods.find(p => Number(p.id) === Number(pid))?.name || '') : 'Activo';
    const careerLabel = cid ? (careers.find(c => Number(c.id) === Number(cid))?.nombre || '') : 'Todas';
    const ts = new Date().toLocaleString();

    const style = `
      <style>
        @page { margin: 14mm; }
        body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; color:#111827; }
        h1 { margin: 0 0 6px; font-size: 20px; }
        h2 { margin: 18px 0 8px; font-size: 14px; }
        .header { display:flex; align-items:center; gap:12px; }
        .right { margin-left:auto; text-align:right; font-weight:600; }
        .muted { color:#6b7280; font-weight:500; font-size:12px; }
        .kpis { display:grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 12px 0; }
        .card { border:1px solid #e5e7eb; border-radius:10px; padding:10px; background:#fff; }
        .card .title { font-size:12px; color:#6b7280; }
        .card .value { font-size:18px; font-weight:700; margin-top:4px; }
        table { width:100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 12px; }
        th { background: #f3f4f6; text-align:left; }
        .footer { position: fixed; bottom: 10mm; left: 14mm; right: 14mm; font-size: 11px; color: #6b7280; display:flex; justify-content: space-between; }
        @media print { .pagenum:after { content: counter(page); } }
      </style>`;

    const header = `
      <div class="header">
        <img src="${origin}/assets/Logo.png" style="height:44px;"/>
        <div class="right">
          <div>Coordinación</div>
          <div class="muted">Período: ${periodLabel} · Carrera: ${careerLabel}</div>
        </div>
      </div>
      <h1>Reporte del Coordinador</h1>`;

    const kpis = `
      <div class="kpis">
        <div class="card"><div class="title">Total en proceso</div><div class="value">${dash.totalEnProceso}</div></div>
        <div class="card"><div class="title">Sin tutor (UIC)</div><div class="value">${dash.sinTutor}</div></div>
        <div class="card"><div class="title">Total estudiantes</div><div class="value">${dash.totalEstudiantes}</div></div>
        <div class="card"><div class="title">UIC</div><div class="value">${dash.uicPercent}%</div></div>
        <div class="card"><div class="title">Complexivo</div><div class="value">${dash.complexivoPercent}%</div></div>
      </div>`;

    const sinTutorRows = (sinTutor || []).map(r => `<tr><td>${r.fullname}</td><td>${r.career_name || ''}</td><td>${r.suggested_tutor || ''}</td></tr>`).join('');
    const conTutorRows = (conTutor || []).map(r => `<tr><td>${r.fullname}</td><td>${r.career_name || ''}</td><td>${r.tutor_name || ''}</td></tr>`).join('');

    const tables = `
      <h2>Estudiantes sin tutor (${(sinTutor || []).length})</h2>
      <table>
        <thead><tr><th>Estudiante</th><th>Carrera</th><th>Tutor sugerido</th></tr></thead>
        <tbody>${sinTutorRows || '<tr><td colspan="3" class="muted">Sin registros</td></tr>'}</tbody>
      </table>

      <h2>Estudiantes con tutor (${(conTutor || []).length})</h2>
      <table>
        <thead><tr><th>Estudiante</th><th>Carrera</th><th>Tutor</th></tr></thead>
        <tbody>${conTutorRows || '<tr><td colspan="3" class="muted">Sin registros</td></tr>'}</tbody>
      </table>`;

    const footer = `
      <div class="footer">
        <div>Generado: ${ts}</div>
        <div>Página <span class="pagenum"></span></div>
      </div>`;

    w.document.write(`<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${header}${kpis}${tables}${footer}<script>setTimeout(()=>{window.print()},100)</script></body></html>`);
    w.document.close();
  }

  private downloadCsv(rows: (string | number)[][], filename: string) {
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }
}
