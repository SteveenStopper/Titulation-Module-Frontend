import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { TribunalEvaluador } from './tribunal-evaluador';

describe('TribunalEvaluador', () => {
  let component: TribunalEvaluador;
  let fixture: ComponentFixture<TribunalEvaluador>;
  let httpMock: HttpTestingController;

  function createComponent() {
    fixture = TestBed.createComponent(TribunalEvaluador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TribunalEvaluador, HttpClientTestingModule]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    createComponent();
    // ngOnInit requests
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);
    expect(component).toBeTruthy();
  });

  it('ngOnInit should load options and handle non-array safely', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([{ id_academic_periods: 1, name: 'P1' }]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([{ id: 10, nombre: 'C1' }]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([{ id_user: 1, fullname: 'D1' }]);

    expect(component.periodOptions.length).toBe(1);
    expect(component.carreraOptions.length).toBe(1);
    expect(component.docentes.length).toBe(1);
  });

  it('addMiembro/removeMiembro should manage members list and enforce max', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.addMiembro();
    component.addMiembro();
    component.addMiembro();
    component.addMiembro();
    expect(component.model.miembros.length).toBe(3);

    component.removeMiembro(1);
    expect(component.model.miembros.length).toBe(2);
  });

  it('selectedTutor should return tutor name of selected student', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.estudiantesUIC = [{ id: 1, nombre: 'E', tutor_id: 9, tutor: 'Tutor' }];
    component.model.estudianteId = 1;
    expect(component.selectedTutor).toBe('Tutor');
  });

  it('onChange should add error when more than 3 members and refresh lists for invalid filters', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.model.miembros = [{}, {}, {}, {}] as any;
    component.model.periodo = undefined;
    component.model.carrera = undefined;
    component.onChange();
    expect(component.errors).toContain('Máximo 3 integrantes.');
    expect(component.estudiantesUIC).toEqual([]);
    expect(component.tribunalAsignado).toEqual([]);
  });

  it('guardar should validate required fields and role/teacher constraints', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.model = { miembros: [{}, {}, {}] } as any;
    component.guardar();
    expect(component.errors.length).toBeGreaterThan(0);
  });

  it('guardar should block tutor being member and duplicated roles', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.estudiantesUIC = [{ id: 1, nombre: 'E', tutor_id: 9, tutor: 'Tutor' }];
    component.model.estudianteId = 1;
    component.model.periodo = 1;
    component.model.carrera = 10;
    component.model.miembros = [
      { rol: 'Integrante del Tribunal 1', docente: 9 },
      { rol: 'Integrante del Tribunal 1', docente: 2 },
      { rol: 'Integrante del Tribunal 3', docente: 3 },
    ] as any;
    component.guardar();
    expect(component.errors.some(e => e.includes('Rol duplicado'))).toBeTrue();
    expect(component.errors.some(e => e.includes('El tutor no puede ser miembro'))).toBeTrue();
  });

  it('guardar should POST assignment and reset on success', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.model.periodo = 1;
    component.model.carrera = 10;
    component.estudiantesUIC = [{ id: 1, nombre: 'E', tutor_id: 9, tutor: 'Tutor' }];
    component.model.estudianteId = 1;
    component.model.miembros = [
      { rol: 'Integrante del Tribunal 1', docente: 2 },
      { rol: 'Integrante del Tribunal 2', docente: 3 },
      { rol: 'Integrante del Tribunal 3', docente: 4 },
    ] as any;

    component.guardar();
    const req = httpMock.expectOne('/api/tribunal/assignments');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      id_user_student: 1,
      id_president: 2,
      id_secretary: 3,
      id_vocal: 4,
      academicPeriodId: 1,
    });
    req.flush({});

    // refresh lists triggered on success
    httpMock.expectOne('/api/uic/admin/estudiantes-uic-sin-tribunal?careerId=10&academicPeriodId=1').flush([]);
    httpMock.expectOne('/api/uic/admin/asignaciones/tribunal?careerId=10&academicPeriodId=1').flush([]);

    expect(component.model.estudianteId).toBeUndefined();
    expect(component.model.miembros.length).toBe(0);
    expect(component.errors.length).toBe(0);
  });

  it('guardar should set errors on backend error', () => {
    createComponent();
    httpMock.expectOne('/api/settings/periods').flush([]);
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/docentes').flush([]);

    component.model.periodo = 1;
    component.model.carrera = 10;
    component.model.estudianteId = 1;
    component.model.miembros = [
      { rol: 'Integrante del Tribunal 1', docente: 2 },
      { rol: 'Integrante del Tribunal 2', docente: 3 },
      { rol: 'Integrante del Tribunal 3', docente: 4 },
    ] as any;

    component.guardar();
    const req = httpMock.expectOne('/api/tribunal/assignments');
    req.flush({ message: 'X' }, { status: 400, statusText: 'Bad Request' });

    // no refresh on error path, but ngOnInit did not fetch filtered lists unless filters set
    expect(component.errors.length).toBe(1);
  });
});
