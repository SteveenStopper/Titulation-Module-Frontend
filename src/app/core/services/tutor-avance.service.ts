import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PeriodService } from '../../services/period.service';

export type ParcialEstado = 'editing' | 'saved' | 'published';

export interface Parcial {
  nota: number | null;
  obs: string;
  estado: ParcialEstado;
}

export interface Avance {
  alumnoId: string;
  p1: Parcial;
  p2: Parcial;
  p3: Parcial;
  publicado: boolean;
}

export interface Alumno {
  id: string;
  nombre: string;
}

export interface FilaAvance {
  alumnoId: string;
  nombre: string;
  p1: Parcial;
  p2: Parcial;
  p3: Parcial;
  publicado: boolean;
}

@Injectable({ providedIn: 'root' })
export class TutorAvanceService {
  private data = new Map<string, {
    alumnos$: BehaviorSubject<Alumno[]>;
    avances$: BehaviorSubject<Avance[]>;
  }>();

  constructor(private http: HttpClient, private periodSvc: PeriodService) {
    this.periodSvc.activePeriod$.subscribe(() => {
      // Los avances/alumnos son dependientes del período; limpiar para evitar arrastre.
      this.data.clear();
    });
  }

  private ensureTutor(tutorId: string) {
    if (!this.data.has(tutorId)) {
      const alumnos: Alumno[] = [];
      const avances: Avance[] = [];
      this.data.set(tutorId, {
        alumnos$: new BehaviorSubject(alumnos),
        avances$: new BehaviorSubject(avances),
      });
    }
    return this.data.get(tutorId)!;
  }

  getAlumnosPorTutor(tutorId: string): Observable<Alumno[]> {
    return this.ensureTutor(tutorId).alumnos$.asObservable();
    }

  getAvancesPorTutor(tutorId: string): Observable<Avance[]> {
    return this.ensureTutor(tutorId).avances$.asObservable();
  }

  getListaTutor(tutorId: string): Observable<FilaAvance[]> {
    const store = this.ensureTutor(tutorId);
    const combined$ = new BehaviorSubject<FilaAvance[]>([]);
    const rebuild = () => {
      const alumnos = store.alumnos$.value;
      const avances = store.avances$.value;
      const lista: FilaAvance[] = avances.map(a => {
        const al = alumnos.find(x => x.id === a.alumnoId)!;
        return {
          alumnoId: a.alumnoId,
          nombre: al?.nombre ?? a.alumnoId,
          p1: { ...a.p1 },
          p2: { ...a.p2 },
          p3: { ...a.p3 },
          publicado: a.publicado,
        };
      });
      combined$.next(lista);
    };
    store.alumnos$.subscribe(() => rebuild());
    store.avances$.subscribe(() => rebuild());
    rebuild();
    return combined$.asObservable();
  }

  // Cargar alumnos desde el backend (usa el usuario autenticado como tutor)
  syncFromBackend(tutorId: string): void {
    const store = this.ensureTutor(tutorId);
    this.http.get<Array<{ id: string; nombre: string }>>('/api/docente/uic/estudiantes').subscribe(list => {
      const alumnos = Array.isArray(list) ? list.map(x => ({ id: x.id, nombre: x.nombre })) : [];
      store.alumnos$.next(alumnos);
      // Inicializar avances para nuevos alumnos si no existen
      const current = store.avances$.value;
      const setIds = new Set(current.map(a => a.alumnoId));
      const nuevos: Avance[] = [];
      for (const al of alumnos) {
        if (!setIds.has(al.id)) {
          nuevos.push({
            alumnoId: al.id,
            p1: { nota: null, obs: '', estado: 'editing' },
            p2: { nota: null, obs: '', estado: 'editing' },
            p3: { nota: null, obs: '', estado: 'editing' },
            publicado: false,
          });
        }
      }
      const next = [...current, ...nuevos];
      store.avances$.next(next);
      // Cargar avances desde backend por cada alumno
      for (const al of alumnos) {
        this.http.get<any>(`/api/docente/uic/avances`, { params: { estudianteId: al.id } }).subscribe(resp => {
          if (!resp || String(resp.alumnoId) !== String(al.id)) return;
          const p1 = resp.p1 ? { nota: resp.p1.nota ?? null, obs: resp.p1.obs ?? '', estado: (resp.p1.nota != null ? 'saved' : 'editing') as ParcialEstado } : { nota: null, obs: '', estado: 'editing' as ParcialEstado };
          const p2 = resp.p2 ? { nota: resp.p2.nota ?? null, obs: resp.p2.obs ?? '', estado: (resp.p2.nota != null ? 'saved' : 'editing') as ParcialEstado } : { nota: null, obs: '', estado: 'editing' as ParcialEstado };
          const p3 = resp.p3 ? { nota: resp.p3.nota ?? null, obs: resp.p3.obs ?? '', estado: (resp.p3.nota != null ? 'saved' : 'editing') as ParcialEstado } : { nota: null, obs: '', estado: 'editing' as ParcialEstado };
          const publicado = !!(p1.nota != null && p2.nota != null && p3.nota != null);
          const updated = store.avances$.value.map(a => a.alumnoId === al.id ? { ...a, p1, p2, p3, publicado } : a);
          store.avances$.next(updated);
        });
      }
    });
  }

  guardarParcial(tutorId: string, alumnoId: string, parcial: 'p1'|'p2'|'p3', body: { nota: number|null; obs: string }) {
    const store = this.ensureTutor(tutorId);
    const parcialNum = parcial === 'p1' ? 1 : parcial === 'p2' ? 2 : 3;
    return this.http.put(`/api/docente/uic/avances/${alumnoId}/${parcialNum}`, { nota: body.nota, observacion: body.obs })
      .pipe(
        // update local state on success
        (source => new Observable(observer => {
          const sub = source.subscribe({
            next: (val) => {
              const avances = store.avances$.value.map(a => {
                if (a.alumnoId !== alumnoId) return a;
                const p = { ...a[parcial], nota: body.nota, obs: body.obs, estado: 'saved' as ParcialEstado };
                return { ...a, [parcial]: p } as Avance;
              });
              store.avances$.next(avances);
              observer.next(val);
              observer.complete();
            },
            error: (err) => observer.error(err),
          });
          return () => sub.unsubscribe();
        }))
      );
  }

  publicarParcial(tutorId: string, alumnoId: string, parcial: 'p1'|'p2'|'p3') {
    const store = this.ensureTutor(tutorId);
    const current = store.avances$.value.find(a => a.alumnoId === alumnoId);
    if (!current) return new Observable(obs => { obs.complete(); });
    const body = { nota: current[parcial].nota, obs: current[parcial].obs } as any;
    const parcialNum = parcial === 'p1' ? 1 : parcial === 'p2' ? 2 : 3;
    return new Observable(observer => {
      const sub = this.http.put(`/api/docente/uic/avances/${alumnoId}/${parcialNum}`, { nota: body.nota, observacion: body.obs })
        .subscribe({
          next: () => {
            // luego notificar publicación
            const sub2 = this.http.post(`/api/docente/uic/avances/${alumnoId}/${parcialNum}/publicar`, {})
              .subscribe({
                next: (val) => {
                  const avances = store.avances$.value.map(a => {
                    if (a.alumnoId !== alumnoId) return a;
                    const actualizado: Avance = { ...a };
                    const p = { ...actualizado[parcial], estado: 'published' as ParcialEstado };
                    actualizado[parcial] = p;
                    if (parcial === 'p3') actualizado.publicado = true;
                    return actualizado;
                  });
                  store.avances$.next(avances);
                  observer.next(val);
                  observer.complete();
                },
                error: (err) => observer.error(err)
              });
            return () => sub2.unsubscribe();
          },
          error: (err) => observer.error(err)
        });
      return () => sub.unsubscribe();
    });
  }
}
