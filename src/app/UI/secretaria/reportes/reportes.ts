import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, combineLatest, firstValueFrom } from 'rxjs';
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators';
import { PeriodService } from '../../../services/period.service';
import { ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  // Filtro de rango (días hacia atrás) para "recientes"
  days$ = new BehaviorSubject<number>(7);

  // KPIs dashboard secretaría
  kpis$!: Observable<any>;

  // Lista de actividad reciente (documentos y validaciones)
  recientes$!: Observable<any[]>;

  // Períodos y Carreras
  periods$!: Observable<Array<{ id: number; name: string }>>;
  careers$!: Observable<Array<{ id: number; nombre: string }>>;
  selectedPeriodId$ = new BehaviorSubject<number | null>(null);
  selectedCareerId$ = new BehaviorSubject<number | null>(null);
  selectedPeriodLabel$!: Observable<string>;
  selectedCareerLabel$!: Observable<string>;

  today = new Date();

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    // cargar periodos y carreras
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: p.id_academic_periods, name: p.name }))),
      catchError(()=> of([] as any[])),
      shareReplay(1)
    );
    this.careers$ = this.http.get<any[]>('/api/uic/admin/carreras').pipe(catchError(()=> of([])), shareReplay(1));

    // Inicializar selección de período activo si existe
    const active = this.periodSvc.getActivePeriod();
    if (active && typeof active === 'string') {
      // periodSvc.activePeriod$ emite string nombre; buscamos id al cargar periods
      this.periods$.subscribe(list => {
        const found = (list || []).find((p: any) => p?.name === active);
        if (found?.id) this.selectedPeriodId$.next(Number(found.id));
      });
    }

    this.kpis$ = combineLatest([
      this.selectedPeriodId$,
      this.selectedCareerId$
    ]).pipe(
      switchMap(([pid, cid]) => this.http.get<any>(`/api/secretaria/dashboard${this.buildQuery({ academicPeriodId: pid, careerId: cid })}`).pipe(
        catchError(()=> of({ actasPendientes: 0, certificadosEmitidosHoy: 0, matriculasProcesadas: 0, estudiantesAtendidos: 0, solicitudesEnCurso: 0 }))
      )),
      shareReplay(1)
    );

    this.recientes$ = combineLatest([
      this.days$,
      this.selectedPeriodId$,
      this.selectedCareerId$
    ]).pipe(
      switchMap(([days, pid, cid]) => this.http.get<any[]>(`/api/secretaria/recientes${this.buildQuery({ days, academicPeriodId: pid, careerId: cid })}`).pipe(catchError(()=> of([])))),
      startWith([] as any[]),
      shareReplay(1)
    );

    // Etiquetas seleccionadas
    this.selectedPeriodLabel$ = combineLatest([this.periods$, this.selectedPeriodId$]).pipe(
      map(([arr, id]) => {
        const it: any = (arr || []).find((p: any) => Number(p.id) === Number(id));
        return it?.name || 'Todos los períodos';
      }),
      startWith('Todos los períodos'),
      shareReplay(1)
    );
    this.selectedCareerLabel$ = combineLatest([this.careers$, this.selectedCareerId$]).pipe(
      map(([arr, id]) => {
        const it: any = (arr || []).find((c: any) => Number(c.id) === Number(id));
        return it?.nombre || 'Todas las carreras';
      }),
      startWith('Todas las carreras'),
      shareReplay(1)
    );
  }

  onChangeDays(event: Event) {
    const select = event.target as HTMLSelectElement | null;
    const v = select && select.value ? Number(select.value) : 7;
    this.days$.next(v);
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

  async onExportReport() {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Reporte Secretaría</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827;">Generando reporte...</div></body></html>');
    w.document.close();
    try {
      const [perLabel, carLabel, kpis, recientes] = await Promise.all([
        firstValueFrom(this.selectedPeriodLabel$),
        firstValueFrom(this.selectedCareerLabel$),
        firstValueFrom(this.kpis$),
        firstValueFrom(this.recientes$)
      ]);
      const listItem = (it: any) => `<li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;">
        <div><div style=\"font-weight:600\">${(it.estudiante||'')}</div><div style=\"color:#6b7280;font-size:12px\">${(it.tramite||'')}</div></div>
        <div style=\"color:#6b7280;font-size:12px\">${new Date(it.fecha).toLocaleString()}</div>
      </li>`;
      const styles = `
        <style>
          @page { margin: 16mm; }
          body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:24px;-webkit-print-color-adjust: exact;print-color-adjust: exact;}
          .muted{color:#6b7280}
          .card{border:1px solid #e5e7eb;border-radius:12px;margin:12px 0}
          .card .h{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151}
          .card .c{padding:12px 16px}
          .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
          .kpi{border:1px solid #e5e7eb;border-radius:12px;padding:12px}
        </style>`;
      const origin = window.location.origin;
      const header = `
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${origin}/assets/Logo.png" style="height:48px;"/>
          <div style="flex:1"></div>
          <div style="font-weight:600;">${perLabel} · ${carLabel}</div>
        </div>
        <h2 style="margin:16px 0 8px 0;">Reportes de Secretaría</h2>`;
      const html = `<!doctype html><html><head><meta charset=\"utf-8\">${styles}<title>Reporte Secretaría</title></head><body>
        ${header}
        <div class=\"kpis\">
          <div class=\"kpi\"><div class=\"muted\">Actas pendientes</div><div style=\"font-size:20px;font-weight:700\">${kpis?.actasPendientes||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Certificados hoy</div><div style=\"font-size:20px;font-weight:700\">${kpis?.certificadosEmitidosHoy||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Matrículas procesadas</div><div style=\"font-size:20px;font-weight:700\">${kpis?.matriculasProcesadas||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Estudiantes atendidos</div><div style=\"font-size:20px;font-weight:700\">${kpis?.estudiantesAtendidos||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Solicitudes en curso</div><div style=\"font-size:20px;font-weight:700\">${kpis?.solicitudesEnCurso||0}</div></div>
        </div>
        <div class=\"card\"><div class=\"h\">Actividad reciente (${Array.isArray(recientes)?recientes.length:0})</div>
          <div class=\"c\">${Array.isArray(recientes)&&recientes.length?`<ul style=\"list-style:none;margin:0;padding:0\">${recientes.slice(0,30).map(listItem).join('')}</ul>`:'<div class=\"muted\">No hay registros.</div>'}</div>
        </div>
        <script>setTimeout(()=>{window.print()},100);<\/script>
      </body></html>`;
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) {
      w.document.open();
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Error</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#991b1b;">No se pudo generar el reporte. Inténtalo nuevamente.</div></body></html>');
      w.document.close();
    }
  }
}
