import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ComisionAsignarLectorComponent } from './asignar-lector';

describe('ComisionAsignarLectorComponent', () => {
  let component: ComisionAsignarLectorComponent;
  let fixture: ComponentFixture<ComisionAsignarLectorComponent>;
  let httpMock: HttpTestingController;

  function createComponent() {
    fixture = TestBed.createComponent(ComisionAsignarLectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComisionAsignarLectorComponent, HttpClientTestingModule],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create and load initial data', () => {
    createComponent();

    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 1, name: 'P1' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    expect(component).toBeTruthy();
    expect(component.periodoId).toBeNull();
  });

  it('should handle cargarEstudiantes when periodoId is null', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: null, name: null });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = undefined as any;
    component.cargarEstudiantes();
    expect(component.estudiantes).toEqual([]);
  });

  it('should refresh lists onChangeCarrera/onChangePeriodo', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 2, name: 'P2' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = 2;

    component.carreraId = 10;
    component.onChangeCarrera();
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=10&academicPeriodId=2').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=10&academicPeriodId=2').flush([]);

    component.onChangePeriodo();
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=10&academicPeriodId=2').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=10&academicPeriodId=2').flush([]);

    expect(component.carreraId).toBe(10);
  });

  it('pickEstudiante should set estudianteId', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 1, name: 'P1' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.pickEstudiante(99);
    expect(component.estudianteId).toBe(99);
  });

  it('asignar should validate missing periodo', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: null, name: null });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = undefined as any;
    component.asignar();
    expect(component.error).toBe('Seleccione un período.');
  });

  it('asignar should validate ids', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 3, name: 'P3' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = 3;

    component.estudianteId = undefined as any;
    component.lectorId = undefined as any;
    component.asignar();
    expect(component.error).toBe('Ingrese IDs válidos.');
  });

  it('asignar should call backend and refresh on success', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 4, name: 'P4' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = 4;

    component.estudianteId = 10;
    component.lectorId = 20;
    component.asignar();

    const req = httpMock.expectOne('/api/uic/admin/asignaciones/lector');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ id_user_student: 10, lector_usuario_id: 20, academicPeriodId: 4 });
    req.flush({});

    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=4').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=4').flush([]);

    expect(component.message).toBe('Lector asignado correctamente');
  });

  it('asignar should set error on backend error', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 4, name: 'P4' });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.periodoId = 4;

    component.estudianteId = 10;
    component.lectorId = 20;
    component.asignar();

    const req = httpMock.expectOne('/api/uic/admin/asignaciones/lector');
    req.flush({ message: 'X' }, { status: 400, statusText: 'Bad Request' });

    httpMock.match((r) => r.url.startsWith('/api/uic/admin/estudiantes-sin-lector')).forEach((r) => r.flush([]));
    httpMock.match((r) => r.url.startsWith('/api/uic/admin/asignaciones/lector')).forEach((r) => r.flush([]));

    expect(component.error).toBe('X');
  });

  it('upsertPeriodo should insert and then update existing entry', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: null, name: null });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    (component as any).upsertPeriodo({ id_academic_periods: 5, name: 'A' });
    expect(component.periodos.length).toBe(1);
    expect(component.periodos[0].name).toBe('A');

    (component as any).upsertPeriodo({ id_academic_periods: 5, name: 'B' });
    expect(component.periodos.length).toBe(1);
    expect(component.periodos[0].name).toBe('B');
  });

  it('cargarPeriodoActivo should auto-select active period when none selected', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=null').flush([]);
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: null, name: null });
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    const eSpy = spyOn(component, 'cargarEstudiantes').and.callThrough();
    const aSpy = spyOn(component, 'cargarAsignados').and.callThrough();
    component.periodoId = undefined as any;

    component.cargarPeriodoActivo();
    httpMock.expectOne('/api/settings/active-period').flush({ id_academic_periods: 9, name: 'P9' });
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-lector?careerId=null&academicPeriodId=9').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/lector?careerId=null&academicPeriodId=9').flush([]);

    expect(component.periodoId).toBe(9);
    expect(eSpy).toHaveBeenCalled();
    expect(aSpy).toHaveBeenCalled();
  });
});
