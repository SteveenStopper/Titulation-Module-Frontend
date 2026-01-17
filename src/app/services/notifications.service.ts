import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface CreateNotification {
  id_user?: number; // opcional si se notifica a un usuario específico
  type: string;
  title: string;
  message?: string;
  entity_type?: string;
  entity_id?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private base = '/api/notifications';
  constructor(private http: HttpClient) {}

  create(payload: CreateNotification): Observable<any> {
    return this.http.post(`${this.base}`, payload);
  }

  listMy(options?: { onlyUnread?: boolean }): Observable<Array<{ id_notification: number; type: string; title: string; message?: string; entity_type?: string; entity_id?: number; is_read: boolean; created_at: string }>> {
    const params: any = {};
    if (options?.onlyUnread) params.onlyUnread = true;
    return this.http.get<any>(`${this.base}`, { params }).pipe(
      map((resp: any) => Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : []))
    );
  }

  markRead(id: number): Observable<any> {
    return this.http.put(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.put(`${this.base}/read-all`, {});
  }
}
