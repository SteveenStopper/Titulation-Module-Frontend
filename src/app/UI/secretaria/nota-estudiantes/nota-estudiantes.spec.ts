import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotaEstudiantes } from './nota-estudiantes';

describe('NotaEstudiantes', () => {
  let component: NotaEstudiantes;
  let fixture: ComponentFixture<NotaEstudiantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotaEstudiantes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotaEstudiantes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
