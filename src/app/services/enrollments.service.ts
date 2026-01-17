import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export type Modality = 'UIC' | 'EXAMEN_COMPLEXIVO';

export interface EnrollmentCurrent {
  id?: number;
  id_user?: number;
  id_academic_periods?: number;
  modality?: Modality;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class EnrollmentsService {
  constructor(private http: HttpClient) {}

  current(academicPeriodId?: number): Observable<EnrollmentCurrent | {}> {
    const params: any = {};
    if (academicPeriodId) params.academicPeriodId = academicPeriodId;
    return this.http.get<EnrollmentCurrent | {}>('/api/enrollments/current', { params })
      .pipe(catchError(() => of({})));
  }

  select(modality: Modality, academicPeriodId?: number) {
    const body: any = { modality };
    if (academicPeriodId) body.academicPeriodId = academicPeriodId;
    return this.http.post('/api/enrollments/select', body);
  }
}
