import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminIngles } from './ingles';

describe('AdminIngles', () => {
  let component: AdminIngles;
  let fixture: ComponentFixture<AdminIngles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminIngles],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminIngles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
