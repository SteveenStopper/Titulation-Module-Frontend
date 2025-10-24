import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PeriodService {
  private storageKey = 'active_period_global';
  private subject = new BehaviorSubject<string | null>(this.readInitial());
  public activePeriod$ = this.subject.asObservable();

  private readInitial(): string | null {
    try {
      return localStorage.getItem(this.storageKey);
    } catch {
      return null;
    }
  }

  getActivePeriod(): string | null {
    return this.subject.value;
  }

  setActivePeriod(periodo: string | null): void {
    if (periodo && periodo.trim()) {
      localStorage.setItem(this.storageKey, periodo);
      this.subject.next(periodo);
    } else {
      localStorage.removeItem(this.storageKey);
      this.subject.next(null);
    }
  }
}
