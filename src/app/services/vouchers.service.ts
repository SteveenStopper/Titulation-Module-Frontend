import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface VoucherPayload {
  v_type: 'pago_titulacion' | 'pago_certificado' | 'pago_acta_grado' | 'otro';
  id_user: number;
  amount?: number;
  reference?: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class VouchersService {
  private base = '/api/vouchers';
  constructor(private http: HttpClient) {}

  list(params?: { v_type?: string; id_user?: number; status?: string; page?: number; pageSize?: number }) {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v != null) p = p.set(k, String(v)); });
    return this.http.get(this.base, { params: p })
      .pipe(catchError(() => of({ data: [] })));
  }

  create(file: File, data: VoucherPayload) {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(data).forEach(([k, v]) => { if (v != null) fd.append(k, String(v)); });
    return this.http.post(this.base, fd);
  }

  download(id: number) {
    return this.http.get(`${this.base}/${id}/download`, { responseType: 'blob' });
  }

  remove(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }

  approve(id: number, observation?: string) {
    return this.http.put(`${this.base}/${id}/approve`, { observacion: observation });
  }

  reject(id: number, observation: string) {
    return this.http.put(`${this.base}/${id}/reject`, { observacion: observation });
  }
}
