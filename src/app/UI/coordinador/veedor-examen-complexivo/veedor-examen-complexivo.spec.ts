import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VeedorExamenComplexivo } from './veedor-examen-complexivo';

describe('VeedorExamenComplexivo', () => {
  let component: VeedorExamenComplexivo;
  let fixture: ComponentFixture<VeedorExamenComplexivo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VeedorExamenComplexivo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VeedorExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
