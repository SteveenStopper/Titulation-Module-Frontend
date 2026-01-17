import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { Reportes } from './reportes';
import { PeriodService } from '../../../services/period.service';

describe('Reportes', () => {
  let component: Reportes;
  let fixture: ComponentFixture<Reportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reportes, HttpClientTestingModule],
      providers: [
        {
          provide: PeriodService,
          useValue: {
            listAll: () => of([]),
            getActivePeriod: () => '',
          },
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
