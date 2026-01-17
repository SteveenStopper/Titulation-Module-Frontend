import { Injectable } from '@angular/core';
import { MeService } from './me.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StudentApiService {
  constructor(private me: MeService) {}

  getActivePeriodId$(): Observable<number | null> {
    return this.me.getProfile().pipe(
      map((res) => res?.activePeriod?.id_academic_periods ?? null)
    );
  }

  withActivePeriod<T extends Record<string, any>>(params?: T): Observable<T & { academicPeriodId?: number } > {
    return this.getActivePeriodId$().pipe(
      map((id) => {
        const base: any = { ...(params || {}) };
        if (id) base.academicPeriodId = id;
        return base;
      })
    );
  }
}
