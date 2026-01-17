import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest, of, firstValueFrom } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  @ViewChild('printHeader', { static: false }) printHeaderRef?: ElementRef<HTMLDivElement>;
  @ViewChild('printContent', { static: false }) printContentRef?: ElementRef<HTMLDivElement>;
  // Filtros
  periods$!: Observable<any[]>;
  selectedPeriodId$ = new BehaviorSubject<number | null>(null);
  careers$!: Observable<Array<{ id: number; nombre: string }>>;
  selectedCareerId$ = new BehaviorSubject<number | null>(null);
  // Labels para impresión
  selectedPeriodLabel$!: Observable<string>;
  selectedCareerLabel$!: Observable<string>;
  today = new Date();

  // KPIs del dashboard por periodo
  dash$ = this.selectedPeriodId$.pipe(
    switchMap((pid) => this.http.get<any>(`/api/uic/admin/dashboard${pid ? `?academicPeriodId=${pid}` : ''}`)
      .pipe(
        map(r => ({
          totalEnProceso: Number(r?.totalEnProceso ?? r?.totalEstudiantes ?? 0),
          uicPercent: Number(r?.uicPercent ?? 0),
          complexivoPercent: Number(r?.complexivoPercent ?? 0)
        })),
        catchError(()=> of({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 }))
      )
    ),
    startWith({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 }),
    shareReplay(1)
  );

  // Listas
  sinTutor$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
    switchMap(([pid, cid]) => this.http.get<any[]>(`/api/uic/admin/estudiantes-sin-tutor${pid || cid ? `?${[pid?`academicPeriodId=${pid}`:'', cid?`careerId=${cid}`:''].filter(Boolean).join('&')}` : ''}`)
      .pipe(catchError(()=> of([])))
    ),
    startWith([] as any[]),
    shareReplay(1)
  );

  conTutor$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
    switchMap(([pid, cid]) => this.http.get<any[]>(`/api/uic/admin/estudiantes-con-tutor${pid || cid ? `?${[pid?`academicPeriodId=${pid}`:'', cid?`careerId=${cid}`:''].filter(Boolean).join('&')}` : ''}`)
      .pipe(catchError(()=> of([])))
    ),
    startWith([] as any[]),
    shareReplay(1)
  );

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    // Cargar periodos cuando el servicio está disponible
    this.periods$ = this.periodSvc.listAll().pipe(shareReplay(1));
    // Cargar carreras desde el esquema del instituto (endpoint backend ya expuesto)
    this.careers$ = this.http.get<Array<{ id: number; nombre: string }>>('/api/uic/admin/carreras')
      .pipe(catchError(()=> of([])), shareReplay(1));
    // Preseleccionar período activo si está disponible
    const activeName = this.periodSvc.getActivePeriod();
    this.periods$.subscribe((rows:any[])=>{
      const match = rows?.find(r => String(r.name) === activeName);
      if (match) this.selectedPeriodId$.next(Number(match.id_academic_periods));
    });

    // Labels combinados
    this.selectedPeriodLabel$ = combineLatest([this.periods$, this.selectedPeriodId$]).pipe(
      map(([rows, pid]) => {
        if (!pid) return 'Activo';
        const r = (rows || []).find((x:any)=> Number(x.id_academic_periods) === Number(pid));
        return r?.name || 'Activo';
      })
    );
    this.selectedCareerLabel$ = combineLatest([this.careers$, this.selectedCareerId$]).pipe(
      map(([rows, cid]) => {
        if (!cid) return 'Todas';
        const r = (rows || []).find((x:any)=> Number(x.id) === Number(cid));
        return r?.nombre || 'Todas';
      })
    );
  }

  onChangePeriod(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const value = select && select.value ? Number(select.value) : null;
    this.selectedPeriodId$.next(value);
  }

  onChangeCareer(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const value = select && select.value ? Number(select.value) : null;
    this.selectedCareerId$.next(value);
  }

  onPrint() { /* deprecated in favor of onExportReport; kept noop to avoid breaking references */ }

  async onExportReport() {
    // Abrir ventana primero para evitar bloqueos del navegador
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Reporte</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827;">Generando reporte...</div></body></html>');
    w.document.close();
    try {
      const [periodLabel, careerLabel, dash, sinTutor, conTutor] = await Promise.all([
        firstValueFrom(this.selectedPeriodLabel$),
        firstValueFrom(this.selectedCareerLabel$),
        firstValueFrom(this.dash$),
        firstValueFrom(this.sinTutor$),
        firstValueFrom(this.conTutor$)
      ]);
      const total = Number(dash?.totalEnProceso || 0);
      const uicPercent = Number(dash?.uicPercent || 0);
      const complexivoPercent = Math.max(0, 100 - uicPercent);
      const uicCount = Math.round((total * uicPercent) / 100);
      const complexivoCount = Math.max(0, total - uicCount);

      const styles = `
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 28px; }
          h1 { font-size: 20px; margin: 0 0 6px 0; text-align: center; }
          .meta { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 18px; }
          .section { margin-top: 18px; }
          .lead { font-size: 14px; line-height: 1.6; }
          .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
          .kpi { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; text-align: center; }
          .kpi .label { font-size: 12px; color: #6b7280; }
          .kpi .value { font-size: 22px; font-weight: 700; color: #111827; }
          .footer { margin-top: 24px; font-size: 11px; color: #6b7280; text-align: right; }
          @media print { .no-print { display:none !important; } }
        </style>
      `;
      const now = new Date();
      const listItem = (t: any) => `<li style="display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:6px 0;">
        <span><strong>${(t?.fullname||'').toString()}</strong>${t?.career_name?`<br/><span style='color:#6b7280;font-size:12px;'>${t.career_name}</span>`:''}</span>
        <span style='color:#6b7280;font-size:12px;'>${t?.tutor_name?`Tutor: ${t.tutor_name}`:(t?.suggested_tutor?`Sugerido: ${t.suggested_tutor}`:'')}</span>
      </li>`;

      const html = `<!doctype html><html><head><meta charset="utf-8">${styles}</head><body>
        <h1>Reporte del Administrador</h1>
        <div class="meta">Generado: ${now.toLocaleDateString()} · Período: ${periodLabel} · Carrera: ${careerLabel}</div>

        <div class="section">
          <p class="lead">
            En el período seleccionado, para la carrera indicada, se registran <strong>${total}</strong> estudiantes en proceso.
            De ellos, <strong>${uicCount}</strong> (${uicPercent}%) optaron por la modalidad <strong>UIC</strong> y
            <strong>${complexivoCount}</strong> (${complexivoPercent}%) por <strong>Examen Complexivo</strong>.
          </p>
          <div class="kpis">
            <div class="kpi"><div class="label">Total en proceso</div><div class="value">${total}</div></div>
            <div class="kpi"><div class="label">UIC</div><div class="value">${uicPercent}%</div></div>
            <div class="kpi"><div class="label">Examen Complexivo</div><div class="value">${complexivoPercent}%</div></div>
          </div>
        </div>

        <div class="section">
          <h2 style="font-size:14px;margin:0 0 8px 0;">Estudiantes sin tutor (${Array.isArray(sinTutor)?sinTutor.length:0})</h2>
          ${Array.isArray(sinTutor) && sinTutor.length ? `<ul class="report-list">${sinTutor.slice(0,20).map(listItem).join('')}</ul>` : `<div class="meta">No hay registros.</div>`}
        </div>

        <div class="section">
          <h2 style="font-size:14px;margin:16px 0 8px 0;">Estudiantes con tutor (${Array.isArray(conTutor)?conTutor.length:0})</h2>
          ${Array.isArray(conTutor) && conTutor.length ? `<ul class="report-list">${conTutor.slice(0,20).map(listItem).join('')}</ul>` : `<div class="meta">No hay registros.</div>`}
        </div>

        <div class="footer">Este informe fue generado automáticamente por el sistema.</div>
      </body></html>`;
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) {
      w.document.open();
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Error</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#991b1b;">No se pudo generar el reporte. Inténtalo nuevamente.</div></body></html>');
      w.document.close();
    }
  }
}
