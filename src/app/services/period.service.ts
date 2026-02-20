import { Injectable } from '@angular/core';
import { BehaviorSubject, map, finalize, catchError, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PeriodService {
  private subject = new BehaviorSubject<string | null>(null);
  public activePeriod$ = this.subject.asObservable();
  // loading flags
  private loadingActiveSubject = new BehaviorSubject<boolean>(false);
  private loadingListSubject = new BehaviorSubject<boolean>(false);
  public loadingActive$ = this.loadingActiveSubject.asObservable();
  public loadingList$ = this.loadingListSubject.asObservable();
  
  constructor(private http: HttpClient) {}

  getActivePeriod(): string | null {
    return this.subject.value;
  }

  // Create academic period in backend
  createPeriod(params: { name: string; date_start: string; date_end: string; status?: string }) {
    return this.http.post<{ id_academic_periods: number; name: string }>(
      '/api/settings/periods',
      params
    );
  }

  // Persist active period to backend (also updates DB estado fields)
  setActivePeriodBackend(id_academic_periods: number, name: string, external_period_id?: number) {
    return this.http.put('/api/settings/active-period', { id_academic_periods, name, external_period_id });
  }

  // Update a period in backend
  updatePeriod(id: number, params: { name?: string; date_start?: string; date_end?: string; status?: 'activo'|'inactivo' }) {
    return this.http.put<any>(`/api/settings/periods/${id}`, params);
  }

  // Close a period in backend and clear active if matches
  closePeriod(id: number) {
    return this.http.post<any>(`/api/settings/periods/${id}/close`, {});
  }

  // Clear active period globally (optional admin action)
  clearActivePeriod() {
    return this.http.delete<any>('/api/settings/active-period');
  }

  setActivePeriod(periodo: string | null): void {
    if (periodo && periodo.trim()) {
      this.subject.next(periodo);
    } else {
      this.subject.next(null);
    }
  }

  private clearPeriodScopedCaches() {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        // Cronogramas: borradores y caché por período
        if (k === 'cronograma_uic_draft') keysToRemove.push(k);
        if (k === 'cronograma_uic_last_published') keysToRemove.push(k);
        if (k.startsWith('cronograma_uic_by_period:')) keysToRemove.push(k);

        if (k === 'cronograma_complexivo_draft') keysToRemove.push(k);
        if (k === 'cronograma_complexivo_last_published') keysToRemove.push(k);
        if (k.startsWith('cronograma_complexivo_by_period:')) keysToRemove.push(k);
      }
      // borrar sin romper el iterador de localStorage
      Array.from(new Set(keysToRemove)).forEach((k) => localStorage.removeItem(k));
    } catch (_) {
      // no bloquear
    }
  }

  // Sync from backend settings
  fetchAndSetFromBackend() {
    this.loadingActiveSubject.next(true);
    return this.http.get<any>('/api/settings/active-period').pipe(
      map((val) => {
        const prev = this.subject.value;
        const name: string | null = val && val.name ? String(val.name) : null;
        // Si cambió el período activo, limpiar cachés locales dependientes del período
        if (prev && name && prev !== name) {
          this.clearPeriodScopedCaches();
        }
        // Si antes había un período y ahora no, también limpiar
        if (prev && !name) {
          this.clearPeriodScopedCaches();
        }
        this.setActivePeriod(name);
        return name;
      }),
      catchError((_err) => {
        // Si falla el backend, limpiar el período activo para no mostrar valores obsoletos
        this.setActivePeriod(null);
        return of(null);
      }),
      finalize(() => this.loadingActiveSubject.next(false))
    );
  }

  // List all academic periods from backend
  listAll() {
    this.loadingListSubject.next(true);
    return this.http.get<Array<{ id_academic_periods: number; name: string; date_start?: string|null; date_end?: string|null; status?: string; used?: boolean; external_period_id?: number|null }>>('/api/settings/periods')
      .pipe(
        catchError((_err) => of([] as Array<{ id_academic_periods: number; name: string; date_start?: string|null; date_end?: string|null; status?: string; used?: boolean; external_period_id?: number|null }>)),
        finalize(() => this.loadingListSubject.next(false))
      );
  }

  // List academic periods from institute DB (for selection)
  listInstitutePeriods() {
    return this.http.get<Array<{ id: number; name: string; status?: string; date_start?: string|null; date_end?: string|null }>>('/api/settings/institute-periods');
  }

  // Save mapping from local period to institute period
  setExternalPeriodMap(id: number, external_period_id: number) {
    return this.http.put<any>(`/api/settings/periods/${id}/external-map`, { external_period_id });
  }

  deletePeriod(id: number) {
    return this.http.delete<any>(`/api/settings/periods/${id}`);
  }

  // Limpiar manualmente el estado en memoria
  clearActive() {
    this.setActivePeriod(null);
  }
}
