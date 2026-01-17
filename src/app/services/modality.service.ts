import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EnrollmentsService, EnrollmentCurrent } from './enrollments.service';

export type Modality = 'UIC' | 'EXAMEN_COMPLEXIVO' | null;

@Injectable({ providedIn: 'root' })
export class ModalityService {
  private subject = new BehaviorSubject<Modality>(null);
  public modality$ = this.subject.asObservable();

  constructor(private enrollSvc: EnrollmentsService) {}

  get value(): Modality { return this.subject.value; }

  refresh(academicPeriodId?: number) {
    this.enrollSvc.current(academicPeriodId).subscribe((res: any) => {
      const mod: Modality = res?.modality ?? null;
      this.subject.next(mod);
    }, _ => this.subject.next(null));
  }

  set(mod: Modality) { this.subject.next(mod); }
}
