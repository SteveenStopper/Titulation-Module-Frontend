import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, combineLatest, firstValueFrom } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { PeriodService } from '../../../services/period.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class Reportes {
  // KPIs
  kpis$!: Observable<{ recaudadoPeriodo: number; pagosHoy: number; vouchersPendientes: number; deudasVencidas: number; arancelesActivos: number }>;

  // Resumen por estudiante filtrado por período/carrera
  resumen$!: Observable<{ data: any[]; pagination: any }>;

  // Vouchers recientes (paginación simple)
  page$ = new BehaviorSubject<number>(1);
  pageSize$ = new BehaviorSubject<number>(10);
  vouchers$!: Observable<{ data: any[]; pagination: any }>;

  // Períodos y carreras
  periods$!: Observable<Array<{ id: number; name: string }>>;
  careers$!: Observable<Array<{ id: number; nombre: string }>>;
  selectedPeriodId$ = new BehaviorSubject<number | null>(null);
  selectedCareerId$ = new BehaviorSubject<number | null>(null);
  selectedPeriodLabel$!: Observable<string>;
  selectedCareerLabel$!: Observable<string>;
  today = new Date();

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    // Catálogos
    this.periods$ = this.periodSvc.listAll().pipe(
      map((arr: any[]) => (arr || []).map((p: any) => ({ id: p.id_academic_periods, name: p.name }))),
      catchError(()=> of([] as any[])),
      shareReplay(1)
    );
    this.careers$ = this.http.get<any[]>('/api/uic/admin/carreras').pipe(catchError(()=> of([])), shareReplay(1));

    // Inicializar período activo por nombre si existe
    const active = this.periodSvc.getActivePeriod();
    if (active && typeof active === 'string') {
      this.periods$.subscribe(list => {
        const found = (list || []).find((p: any) => p?.name === active);
        if (found?.id) this.selectedPeriodId$.next(Number(found.id));
      });
    }

    this.kpis$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
      switchMap(([pid, cid]) => this.http.get<any>(`/api/tesoreria/dashboard${this.buildQuery({ academicPeriodId: pid, careerId: cid })}`).pipe(
        map(r => ({
          recaudadoPeriodo: Number(r?.recaudadoPeriodo || 0),
          pagosHoy: Number(r?.pagosHoy || 0),
          vouchersPendientes: Number(r?.vouchersPendientes || 0),
          deudasVencidas: Number(r?.deudasVencidas || 0),
          arancelesActivos: Number(r?.arancelesActivos || 0)
        })),
        catchError(()=> of({ recaudadoPeriodo: 0, pagosHoy: 0, vouchersPendientes: 0, deudasVencidas: 0, arancelesActivos: 0 }))
      )),
      shareReplay(1)
    );

    this.resumen$ = combineLatest([this.selectedPeriodId$, this.selectedCareerId$]).pipe(
      switchMap(([pid, cid]) => this.http.get<any>(`/api/tesoreria/resumen${this.buildQuery({ academicPeriodId: pid, careerId: cid })}`).pipe(catchError(()=> of({ data: [], pagination: { page:1, pageSize:10, total:0 } })))),
      shareReplay(1)
    );

    this.vouchers$ = this.page$.pipe(
      switchMap((page)=> this.http.get<any>(`/api/vouchers?page=${page}&pageSize=${this.pageSize$.value}`).pipe(catchError(()=> of({ data: [], pagination: { page, pageSize: this.pageSize$.value, total: 0 } })))),
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

  nextPage() { this.page$.next(this.page$.value + 1); }
  prevPage() { this.page$.next(Math.max(1, this.page$.value - 1)); }

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
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Reporte Tesorería</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111827;">Generando reporte...</div></body></html>');
    w.document.close();
    try {
      // Construir labels derivados
      this.selectedPeriodLabel$ = combineLatest([this.periods$, this.selectedPeriodId$]).pipe(
        map(([arr, id]) => {
          const it: any = (arr || []).find((p: any) => Number(p.id) === Number(id));
          return it?.name || 'Todos los períodos';
        }),
        shareReplay(1)
      );
      this.selectedCareerLabel$ = combineLatest([this.careers$, this.selectedCareerId$]).pipe(
        map(([arr, id]) => {
          const it: any = (arr || []).find((c: any) => Number(c.id) === Number(id));
          return it?.nombre || 'Todas las carreras';
        }),
        shareReplay(1)
      );
      const [perLabel, carLabel, kpis, resumen, vouchers] = await Promise.all([
        firstValueFrom(this.selectedPeriodLabel$),
        firstValueFrom(this.selectedCareerLabel$),
        firstValueFrom(this.kpis$),
        firstValueFrom(this.resumen$),
        firstValueFrom(this.vouchers$)
      ]);
      const listRes = (r: any) => `<li style=\"display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6\">`+
        `<div><div style=\"font-weight:600\">${r.nombre||''}</div><div style=\"color:#6b7280;font-size:12px\">${r.carrera_nombre||r.carrera||''}</div></div>`+
        `<div style=\"color:#6b7280;font-size:12px\">${r.estado_aranceles||'-'}</div></li>`;
      const listVoucher = (v: any) => `<li style=\"display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6\">`+
        `<div><div style=\"font-weight:600\">${v.voucher_type||'voucher'}</div><div class=\"muted\" style=\"font-size:12px\">${v.users?.firstname||''} ${v.users?.lastname||''}</div></div>`+
        `<div style=\"color:#111827;font-weight:600\">$${Number(v.amount||0).toFixed(2)}</div></li>`;
      const styles = `<style>body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:24px}.muted{color:#6b7280}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.kpi{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.card{border:1px solid #e5e7eb;border-radius:12px;margin:12px 0}.card .h{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#374151}.card .c{padding:12px 16px}</style>`;
      const html = `<!doctype html><html><head><meta charset=\"utf-8\">${styles}<title>Reporte Tesorería</title></head><body>
        <div style=\"text-align:center;margin-bottom:12px\"><div style=\"font-size:18px;font-weight:700\">Informe de Tesorería</div>
          <div class=\"muted\">Fecha: ${this.today.toLocaleDateString()} · Período: ${perLabel || 'Todos'} · Carrera: ${carLabel || 'Todas'}</div></div>
        <div class=\"kpis\">
          <div class=\"kpi\"><div class=\"muted\">Recaudado (período)</div><div style=\"font-size:20px;font-weight:700\">$${Number(kpis?.recaudadoPeriodo||0).toFixed(2)}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Comprobantes hoy</div><div style=\"font-size:20px;font-weight:700\">${kpis?.pagosHoy||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Vouchers pendientes</div><div style=\"font-size:20px;font-weight:700\">${kpis?.vouchersPendientes||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Deudas vencidas</div><div style=\"font-size:20px;font-weight:700\">${kpis?.deudasVencidas||0}</div></div>
          <div class=\"kpi\"><div class=\"muted\">Aranceles activos</div><div style=\"font-size:20px;font-weight:700\">${kpis?.arancelesActivos||0}</div></div>
        </div>
        <div class=\"card\"><div class=\"h\">Resumen por estudiante (${Array.isArray(resumen?.data)?resumen.data.length:0})</div>
          <div class=\"c\">${Array.isArray(resumen?.data)&&resumen.data.length?`<ul style=\"list-style:none;margin:0;padding:0\">${resumen.data.slice(0,20).map(listRes).join('')}</ul>`:'<div class=\"muted\">No hay registros.</div>'}</div>
        </div>
        <div class=\"card\"><div class=\"h\">Vouchers (${Array.isArray(vouchers?.data)?vouchers.data.length:0})</div>
          <div class=\"c\">${Array.isArray(vouchers?.data)&&vouchers.data.length?`<ul style=\"list-style:none;margin:0;padding:0\">${vouchers.data.slice(0,20).map(listVoucher).join('')}</ul>`:'<div class=\"muted\">No hay registros.</div>'}</div>
        </div>
      </body></html>`;
      w.document.open(); w.document.write(html); w.document.close();
    } catch (e) {
      w.document.open();
      w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Error</title></head><body><div style="font-family:Arial,Helvetica,sans-serif;padding:24px;color:#991b1b;">No se pudo generar el reporte. Inténtalo nuevamente.</div></body></html>');
      w.document.close();
    }
  }
}
