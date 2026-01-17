import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, catchError } from 'rxjs';
import { StudentApiService } from './student-api.service';
import { AuthService } from './auth.service';

export interface CronoFila {
  nro: number;
  actividad: string;
  responsable: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface CronogramaView {
  titulo?: string;
  periodo?: string;
  proyecto?: string;
  filas: CronoFila[];
}

export interface AvanceView {
  tutorNombre: string | null;
  p1: number | null;
  p2: number | null;
  p3: number | null;
}

export interface ComplexivoMateriaView {
  id: string;
  codigo: string;
  nombre: string;
  docente: string | null;
}

@Injectable({ providedIn: 'root' })
export class StudentCronogramaService {
  constructor(private http: HttpClient, private studentApi: StudentApiService, private auth: AuthService) {}

  getUICByActivePeriod(): Observable<CronogramaView | null> {
    return this.studentApi.getActivePeriodId$().pipe(
      switchMap((id) => {
        const params: any = {};
        if (id) params.academicPeriodId = id;
        return this.http.get<CronogramaView | null>('/api/cronogramas/uic', { params })
          .pipe(catchError(() => of(null)));
      })
    );
  }

  // Placeholder until BE provides complexivo cronograma endpoint
  getComplexivoByActivePeriod(): Observable<CronogramaView | null> {
    return this.studentApi.getActivePeriodId$().pipe(
      switchMap((id) => {
        const params: any = {};
        if (id) params.academicPeriodId = id;
        return this.http.get<CronogramaView | null>('/api/cronogramas/complexivo', { params })
          .pipe(catchError(() => of(null)));
      })
    );
  }

  getAvanceUIC(): Observable<AvanceView> {
    return this.http.get<AvanceView>('/api/uic/estudiante/avance')
      .pipe(catchError(() => of({ tutorNombre: null, p1: null, p2: null, p3: null })));
  }

  sendInformeFinal(): Observable<any> {
    const user = this.auth.currentUserValue;
    const id = user?.id_user;
    if (!id) return of({ ok: false });
    return this.http.post('/api/uic/final/entregado', { id_user_student: Number(id) });
  }

  uploadUicFinal(file: File): Observable<any> {
    const user = this.auth.currentUserValue;
    const id = user?.id_user;
    if (!id || !file) return of({ ok: false });
    const fd = new FormData();
    fd.append('tipo', 'uic_final');
    fd.append('usuario_id', String(id));
    fd.append('file', file);
    return this.http.post('/api/documents', fd);
  }

  getMyComplexivoMaterias(): Observable<ComplexivoMateriaView[]> {
    return this.http.get<ComplexivoMateriaView[]>('/api/complexivo/estudiante/materias')
      .pipe(catchError(() => of([])));
  }
}
