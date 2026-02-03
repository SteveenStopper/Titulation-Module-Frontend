import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SecretariaPromedioItem {
  estudiante_id: number;
  nombre: string;
  carrera: string;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  s4: number | null;
  s5?: number | null;
  promedio_general: number | null;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  certificado_doc_id?: number | null;
}

@Injectable({ providedIn: 'root' })
export class SecretariaService {
  private base = '/api/secretaria';
  constructor(private http: HttpClient) { }

  listPromedios(page = 1, pageSize = 20): Observable<{ data: SecretariaPromedioItem[]; pagination?: any }> {
    const params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    return this.http.get<{ data: SecretariaPromedioItem[]; pagination?: any }>(`${this.base}/promedios`, { params });
  }

  getPromediosById(id: number): Observable<SecretariaPromedioItem> {
    return this.http.get<SecretariaPromedioItem>(`${this.base}/promedios/${id}`);
  }

  getNotasDetalle(id: number): Observable<SecretariaPromedioItem> {
    return this.http.get<SecretariaPromedioItem>(`${this.base}/notas/${id}`);
  }

  generarCertNotas(userId: number, academicPeriodId?: number) {
    const body: any = { userId };
    if (academicPeriodId) body.academicPeriodId = academicPeriodId;
    return this.http.post<any>(`${this.base}/certificados/notas`, body);
  }

  approve(estudiante_id: number, periodo_id?: number) {
    const body: any = { estudiante_id };
    if (periodo_id) body.periodo_id = periodo_id;
    return this.http.put<any>(`${this.base}/validaciones/approve`, body);
  }

  reject(estudiante_id: number, observacion: string, periodo_id?: number) {
    const body: any = { estudiante_id, observacion };
    if (periodo_id) body.periodo_id = periodo_id;
    return this.http.put<any>(`${this.base}/validaciones/reject`, body);
  }

  reconsiderar(estudiante_id: number, periodo_id?: number) {
    const body: any = { estudiante_id };
    if (periodo_id) body.periodo_id = periodo_id;
    return this.http.put<any>(`${this.base}/validaciones/reconsider`, body);
  }
}
