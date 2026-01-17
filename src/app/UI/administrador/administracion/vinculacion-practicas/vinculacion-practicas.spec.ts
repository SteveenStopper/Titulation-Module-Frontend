import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminVinculacionPracticas } from './vinculacion-practicas';

describe('AdminVinculacionPracticas', () => {
  let component: AdminVinculacionPracticas;
  let fixture: ComponentFixture<AdminVinculacionPracticas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminVinculacionPracticas],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminVinculacionPracticas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
