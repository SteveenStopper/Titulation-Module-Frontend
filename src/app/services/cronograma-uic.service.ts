import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface CronoFila {
  nro: number;
  actividad: string;
  responsable: string;
  fechaInicio?: string; // ISO date
  fechaFin?: string;    // ISO date
}

export interface CronogramaUIC {
  titulo?: string;
  periodo?: string;
  proyecto?: string;
  filas: CronoFila[];
}

@Injectable({ providedIn: 'root' })
export class CronogramaUicService {
  private draft: CronogramaUIC = {
    titulo: 'CRONOGRAMA DEL PROCESO DE TITULACIÓN',
    periodo: undefined,
    proyecto: 'PROYECTO DE TESIS',
    filas: []
  };

  private draftKey = 'cronograma_uic_draft';
  private apiUrl = '/api/cronogramas/uic';
  private byPeriodPrefix = 'cronograma_uic_by_period:';
  private lastPublishedKey = 'cronograma_uic_last_published';

  private publishedSubject = new BehaviorSubject<CronogramaUIC | null>(null);
  public published$ = this.publishedSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Obtener el último cronograma publicado desde la API
  getUltimoCronograma(): Observable<CronogramaUIC | null> {
    return this.http.get<CronogramaUIC | null>(`${this.apiUrl}/ultimo`);
  }

  getDraft(): CronogramaUIC {
    return JSON.parse(JSON.stringify(this.draft));
  }

  setDraft(next: CronogramaUIC) {
    this.draft = JSON.parse(JSON.stringify(next));
  }

  addRow() {
    const nextNro = (this.draft.filas[this.draft.filas.length - 1]?.nro || 0) + 1;
    this.draft.filas.push({ nro: nextNro, actividad: '', responsable: '', fechaInicio: '', fechaFin: '' });
  }

  removeRow(index: number) {
    this.draft.filas.splice(index, 1);
    // Re-enumerar
    this.draft.filas = this.draft.filas.map((f, i) => ({ ...f, nro: i + 1 }));
  }

  publish(): Observable<CronogramaUIC> {
    const draft = JSON.parse(JSON.stringify(this.draft));
    const body = {
      title: draft.titulo || 'CRONOGRAMA DEL PROCESO DE TITULACIÓN',
      period_label: draft.periodo || 'SIN_PERIODO',
      project_label: draft.proyecto || 'PROYECTO DE TESIS',
      items: (draft.filas || []).map((f: any) => ({
        row_number: f.nro,
        activity_description: f.actividad,
        responsible: f.responsable,
        date_start: f.fechaInicio ? new Date(f.fechaInicio).toISOString() : undefined,
        date_end: f.fechaFin ? new Date(f.fechaFin).toISOString() : undefined,
      }))
    };
    return this.http.post<CronogramaUIC>(`${this.apiUrl}/publicar`, body);
  }

  loadDraft(): CronogramaUIC | null {
    const savedDraft = localStorage.getItem(this.draftKey);
    if (savedDraft) {
      return JSON.parse(savedDraft);
    }
    return null;
  }

  getByPeriodId(academicPeriodId: number): Observable<CronogramaUIC | null> {
    return this.http.get<CronogramaUIC | null>(`${this.apiUrl}`, { params: { academicPeriodId } as any });
  }

  // Crear o devolver borrador desde último publicado para el período indicado
  createDraft(academicPeriodId: number): Observable<CronogramaUIC | null> {
    return this.http.get<CronogramaUIC | null>(`/api/cronogramas/draft`, {
      params: { academicPeriodId, modalidad: 'UIC' } as any
    });
  }

  // Backward-compatible method used by some components
  getByPeriod(periodo: string): CronogramaUIC | null {
    // If the old component passes a label, try local cache; if it's a numeric string id, we can't sync here
    const asNum = Number(periodo);
    if (!Number.isNaN(asNum) && String(asNum) === periodo.trim()) {
      // Old code shouldn't call this with numeric; prefer getByPeriodId from the component instead.
      // Return last published as a safe fallback.
      return this.getUltimoPublicado();
    }
    // Legacy behavior: check localStorage by label
    return this.getByPeriodLegacy(periodo);
  }

  private getByPeriodLegacy(periodo: string): CronogramaUIC | null {
    const saved = localStorage.getItem(this.byPeriodPrefix + periodo);
    return saved ? JSON.parse(saved) : null;
  }

  saveAsPublished(periodo: string, data: CronogramaUIC): void {
    const cloned = JSON.parse(JSON.stringify(data));
    cloned.periodo = periodo;
    localStorage.setItem(this.byPeriodPrefix + periodo, JSON.stringify(cloned));
    localStorage.setItem(this.lastPublishedKey, JSON.stringify(cloned));
    this.publishedSubject.next(cloned);
  }

  getUltimoPublicado(): CronogramaUIC | null {
    const saved = localStorage.getItem(this.lastPublishedKey);
    return saved ? JSON.parse(saved) : null;
  }
}
