import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

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

  private ensureTutor(tutorId: string) {
    if (!this.data.has(tutorId)) {
      const alumnos: Alumno[] = [
        { id: 'a1', nombre: 'Juan Pérez' },
        { id: 'a2', nombre: 'María Vásquez' },
        { id: 'a3', nombre: 'Carlos Díaz' },
      ];
      const avances: Avance[] = [
        { alumnoId: 'a1', p1: { nota: 8.5, obs: 'Buen inicio', estado: 'saved' }, p2: { nota: null, obs: '', estado: 'editing' }, p3: { nota: null, obs: '', estado: 'editing' }, publicado: false },
        { alumnoId: 'a2', p1: { nota: 9.2, obs: 'Destacado', estado: 'saved' }, p2: { nota: null, obs: '', estado: 'editing' }, p3: { nota: null, obs: '', estado: 'editing' }, publicado: false },
        { alumnoId: 'a3', p1: { nota: null, obs: '', estado: 'editing' }, p2: { nota: null, obs: '', estado: 'editing' }, p3: { nota: null, obs: '', estado: 'editing' }, publicado: false },
      ];
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

  guardarParcial(tutorId: string, alumnoId: string, parcial: 'p1'|'p2'|'p3', body: { nota: number|null; obs: string }): void {
    const store = this.ensureTutor(tutorId);
    const avances = store.avances$.value.map(a => {
      if (a.alumnoId !== alumnoId) return a;
      const p = { ...a[parcial], nota: body.nota, obs: body.obs, estado: 'saved' as ParcialEstado };
      return { ...a, [parcial]: p } as Avance;
    });
    store.avances$.next(avances);
  }

  publicarParcial(tutorId: string, alumnoId: string, parcial: 'p1'|'p2'|'p3'): void {
    const store = this.ensureTutor(tutorId);
    const avances = store.avances$.value.map(a => {
      if (a.alumnoId !== alumnoId) return a;
      const actualizado: Avance = { ...a };
      const p = { ...actualizado[parcial], estado: 'published' as ParcialEstado };
      actualizado[parcial] = p;
      if (parcial === 'p3') actualizado.publicado = true;
      return actualizado;
    });
    store.avances$.next(avances);
  }
}
