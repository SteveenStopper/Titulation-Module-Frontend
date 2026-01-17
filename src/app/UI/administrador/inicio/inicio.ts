import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, startWith } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../../services/period.service';
import { NotificationsService } from '../../../services/notifications.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  activo$: Observable<string | null>;
  loading$: Observable<boolean>;
  dash$: Observable<{ totalEnProceso: number; uicPercent: number; complexivoPercent: number } | null>;
  dashLoading$: Observable<boolean>;
  recent$: Observable<Array<{ id_notification: number; title: string; message?: string; created_at?: string }>>;
  recentLoading$: Observable<boolean>;

  constructor(private periodSvc: PeriodService, private http: HttpClient, private notifSvc: NotificationsService) {
    this.activo$ = this.periodSvc.activePeriod$ as Observable<string | null>;
    this.loading$ = this.periodSvc.loadingActive$ as Observable<boolean>;

    const current = this.periodSvc.getActivePeriod();
    if (!current) {
      this.periodSvc.fetchAndSetFromBackend().subscribe();
    }

    // Dashboard estudiantes en proceso por modalidad
    const dash$ = this.http.get<any>('/api/uic/admin/dashboard').pipe(
      map((r:any)=>({
        totalEnProceso: Number(r?.totalEnProceso ?? r?.totalEstudiantes ?? 0),
        uicPercent: Number(r?.uicPercent ?? 0),
        complexivoPercent: Number(r?.complexivoPercent ?? 0)
      })),
      catchError(()=> of({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 })),
      shareReplay(1)
    );
    this.dashLoading$ = dash$.pipe(map(()=>false), startWith(true));
    this.dash$ = dash$.pipe(startWith(null));

    // Actividad reciente global (últimas 5 notificaciones del sistema)
    const recent$ = this.http.get<any>('/api/notifications/admin/recent?limit=5').pipe(
      map(list => (Array.isArray(list) ? list : [])),
      catchError(() => of([] as any[])),
      shareReplay(1)
    );
    this.recentLoading$ = recent$.pipe(map(()=>false), startWith(true));
    this.recent$ = recent$;
  }
}
