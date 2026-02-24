import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TesoreriaResumenItem {
  estudiante_id: number;
  cedula?: string;
  nombre: string;
  carrera_id?: number;
  carrera_nombre?: string;
  semestre_aprobado_max?: number;
  estado_aranceles?: string; // Activo/Inactivo (si viene desde vistas)
  periodo_id?: number;
  validacion_estado?: 'pending' | 'approved' | 'rejected';
  validacion_observacion?: string | null;
  certificado_doc_id?: number | null;
}

export interface Page<T> {
  data: T[];
  careers?: Array<{ id: number; nombre: string }>;
  pagination: { page: number; pageSize: number; total?: number; totalPages?: number };
}

@Injectable({ providedIn: 'root' })
export class TesoreriaService {
  private base = '/api/tesoreria';

  constructor(private http: HttpClient) {}

  getResumen(page = 1, pageSize = 20, minSem?: number, careerId?: number | null): Observable<Page<TesoreriaResumenItem>> {
    const params: any = { page, pageSize };
    if (minSem !== undefined && minSem !== null) params.minSem = String(minSem);
    if (careerId !== undefined && careerId !== null) params.careerId = String(careerId);
    return this.http.get<Page<TesoreriaResumenItem>>(`${this.base}/resumen`, { params });
  }

  aprobar(periodo_id: number, estudiante_id: number) {
    return this.http.put(`${this.base}/validaciones/approve`, { periodo_id, estudiante_id });
  }

  rechazar(periodo_id: number, estudiante_id: number, observacion?: string) {
    return this.http.put(`${this.base}/validaciones/reject`, { periodo_id, estudiante_id, observacion });
  }

  reconsiderar(periodo_id: number, estudiante_id: number) {
    return this.http.put(`${this.base}/validaciones/reconsider`, { periodo_id, estudiante_id });
  }

  generarCertificado(periodo_id: number, estudiante_id: number) {
    return this.http.post(`${this.base}/certificados`, { periodo_id, estudiante_id });
  }

  descargarCertificadoPorDoc(docId: number): Observable<Blob> {
    return this.http.get(`${this.base}/certificados/${docId}/download`, { responseType: 'blob' });
  }

  descargarCertificadoPorEstudiante(estudiante_id: number, periodo_id?: number): Observable<Blob> {
    const params: any = {};
    if (periodo_id !== undefined) params.periodo_id = String(periodo_id);
    return this.http.get(`${this.base}/certificados/by-student/${estudiante_id}`, { params, responseType: 'blob' });
  }
}
