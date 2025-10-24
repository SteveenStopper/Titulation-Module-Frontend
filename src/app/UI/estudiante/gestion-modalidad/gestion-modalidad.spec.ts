import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionModalidad } from './gestion-modalidad';

describe('GestionModalidad', () => {
  let component: GestionModalidad;
  let fixture: ComponentFixture<GestionModalidad>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionModalidad]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
