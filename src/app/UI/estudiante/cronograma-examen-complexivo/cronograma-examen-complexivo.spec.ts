import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CronogramaExamenComplexivo } from './cronograma-examen-complexivo';

describe('CronogramaExamenComplexivo', () => {
  let component: CronogramaExamenComplexivo;
  let fixture: ComponentFixture<CronogramaExamenComplexivo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CronogramaExamenComplexivo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
