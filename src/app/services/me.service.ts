import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { PeriodService } from './period.service';

export interface MeProfileResponse {
  user: { id_user: number; firstname: string; lastname: string; email: string; is_active: boolean } | null;
  activePeriod: { id_academic_periods: number; name: string } | null;
  enrollment: { id: number; modality: 'UIC' | 'EXAMEN_COMPLEXIVO'; status: string } | null;
  validations?: {
    tesoreria_aranceles?: { estado: 'pending' | 'approved' | 'rejected'; observacion?: string | null; actualizado_en?: string | null };
    secretaria_promedios?: { estado: 'pending' | 'approved' | 'rejected'; observacion?: string | null; actualizado_en?: string | null };
    [k: string]: any;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class MeService {
  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    // El perfil incluye activePeriod/enrollment/validations; debe refrescarse cuando cambia el período.
    this.periodSvc.activePeriod$.subscribe(() => {
      this.cached$ = undefined;
    });
  }
  private cached$?: Observable<MeProfileResponse>;

  getProfile(): Observable<MeProfileResponse> {
    if (!this.cached$) {
      this.cached$ = this.http.get<MeProfileResponse>('/api/me/profile', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      }).pipe(shareReplay(1));
    }
    return this.cached$;
  }
}
