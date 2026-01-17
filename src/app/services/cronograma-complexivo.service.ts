import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CronogramaUIC, CronoFila } from './cronograma-uic.service';

@Injectable({ providedIn: 'root' })
export class CronogramaComplexivoService {
  // Borrador independiente para Examen Complexivo
  private draft: CronogramaUIC = {
    titulo: 'CRONOGRAMA DEL PROCESO DE TITULACIÓN',
    periodo: undefined,
    proyecto: 'EXAMEN COMPLEXIVO',
    filas: []
  };

  private draftKey = 'cronograma_complexivo_draft';
  private byPeriodPrefix = 'cronograma_complexivo_by_period:';
  private lastPublishedKey = 'cronograma_complexivo_last_published';

  private publishedSubject = new BehaviorSubject<CronogramaUIC | null>(null);
  public published$ = this.publishedSubject.asObservable();
  private apiUrl = '/api/cronogramas/complexivo';

  constructor(private http: HttpClient) {}

  getDraft(): CronogramaUIC {
    return JSON.parse(JSON.stringify(this.draft));
  }

  setDraft(next: CronogramaUIC) {
    this.draft = JSON.parse(JSON.stringify(next));
  }

  addRow() {
    const nextNro = (this.draft.filas[this.draft.filas.length - 1]?.nro || 0) + 1;
    this.draft.filas.push({ nro: nextNro, actividad: '', responsable: '', fechaInicio: '', fechaFin: '' } as CronoFila);
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
      project_label: draft.proyecto || 'EXAMEN COMPLEXIVO',
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

  getByPeriod(periodo: string): CronogramaUIC | null {
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

  getByPeriodId(academicPeriodId: number) {
    return this.http.get<CronogramaUIC | null>(`${this.apiUrl}`, { params: { academicPeriodId } as any });
  }

  createDraft(academicPeriodId: number) {
    return this.http.get<CronogramaUIC | null>(`/api/cronogramas/draft`, {
      params: { academicPeriodId, modalidad: 'EXAMEN_COMPLEXIVO' } as any
    });
  }
}
