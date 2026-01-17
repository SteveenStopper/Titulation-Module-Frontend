import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { Reportes } from './reportes';
import { PeriodService } from '../../../services/period.service';

describe('Reportes', () => {
  let component: Reportes;
  let fixture: ComponentFixture<Reportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportes],
      providers: [
        {
          provide: PeriodService,
          useValue: { listAll: () => of([]), getActivePeriod: () => '' },
        },
        {
          provide: HttpClient,
          useValue: { get: () => of([]) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reportes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
