import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  constructor(private http: HttpClient) {}

  list(params?: {
    // filtering
    category?: string;
    scope?: string;
    tipo?: string;
    doc_type?: string;
    document_type?: string;
    id_owner?: number;
    id_user?: number;
    page?: number;
    pageSize?: number;
  }) {
    let p = new HttpParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v != null) p = p.set(k, String(v)); });
    return this.http.get('/api/documents', { params: p });
  }

  upload(formData: FormData) {
    return this.http.post('/api/documents', formData);
  }

  getById(id: number) {
    return this.http.get(`/api/documents/${id}`);
  }

  download(id: number) {
    return this.http.get(`/api/documents/${id}/download`, { responseType: 'blob' });
  }

  remove(id: number) {
    return this.http.delete(`/api/documents/${id}`);
  }

  setStatus(id: number, estado: 'en_revision'|'aprobado'|'rechazado', observacion?: string) {
    const body: any = { estado };
    if (observacion) body.observacion = observacion;
    return this.http.patch(`/api/documents/${id}/status`, body);
  }
}
