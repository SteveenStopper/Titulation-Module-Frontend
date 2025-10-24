import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TribunalEvaluador } from './tribunal-evaluador';

describe('TribunalEvaluador', () => {
  let component: TribunalEvaluador;
  let fixture: ComponentFixture<TribunalEvaluador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TribunalEvaluador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TribunalEvaluador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
