import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionExamenes } from './gestion-examenes';

describe('GestionExamenes', () => {
  let component: GestionExamenes;
  let fixture: ComponentFixture<GestionExamenes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionExamenes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestionExamenes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
