import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { GestionExamenes } from './gestion-examenes';

describe('GestionExamenes', () => {
  let component: GestionExamenes;
  let fixture: ComponentFixture<GestionExamenes>;
  let httpMock: HttpTestingController;

  function createComponent() {
    fixture = TestBed.createComponent(GestionExamenes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionExamenes, HttpClientTestingModule]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);
    expect(component).toBeTruthy();
  });

  it('should handle non-array docentes/carreras responses', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush({});
    httpMock.expectOne('/api/vicerrector/carreras').flush({});
    expect(component.docentes).toEqual([]);
    expect(component.carrerasCat).toEqual([]);
  });

  it('should handle non-array materias list response in cargar()', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush({});
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);
    expect(component.registros).toEqual([]);
  });

  it('getters should compute carreras/filteredMaterias/limites/publicables', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: 'A', tutorId: 1 },
      { id: 2, nombre: 'M2', carrera: 'A', tutorId: null },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }, { id: 11, nombre: 'B' }]);

    expect(component.carreras).toEqual(['A', 'B']);

    component.carreraFiltro = 'A';
    expect(component.filteredMaterias.length).toBe(2);
    component.carreraFiltro = '';
    expect(component.filteredMaterias.length).toBe(2);

    component.carreraAsignacion = '';
    expect(component.totalRegistradasCarreraSeleccionada).toBe(0);
    expect(component.totalPublicables).toBe(0);
    component.carreraAsignacion = 'A';
    expect(component.totalRegistradasCarreraSeleccionada).toBe(2);
    expect(component.limiteAlcanzado).toBeFalse();

    expect(component.totalPublicables).toBe(1);
  });

  it('should ignore registros from other carreras in totals and ya-set', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: 'A', tutorId: 1 },
      { id: 2, nombre: 'M2', carrera: 'A', tutorId: null },
      { id: 3, nombre: 'M3', carrera: 'B', tutorId: 1 },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }, { id: 11, nombre: 'B' }]);

    component.carreraAsignacion = 'A';
    expect(component.totalRegistradasCarreraSeleccionada).toBe(2);
    expect(component.totalPublicables).toBe(1);

    component.catalogoMaterias['A'] = [
      { id: 1, nombre: 'M1' },
      { id: 2, nombre: 'M2' },
      { id: 3, nombre: 'M3' },
      { id: 4, nombre: 'M4' },
    ];
    expect(component.materiasDeCarrera.map(x => x.id)).toEqual([3, 4]);
  });

  it('totalPublicables should count tutorId undefined as publicable (since it is !== null)', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: 'A', tutorId: undefined },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    expect(component.totalPublicables).toBe(1);
  });

  it('carreras should exclude carreras with MAX materias and ignore null carrera in count', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: 'A', tutorId: 1 },
      { id: 2, nombre: 'M2', carrera: 'A', tutorId: 1 },
      { id: 3, nombre: 'M3', carrera: 'A', tutorId: 1 },
      { id: 4, nombre: 'M4', carrera: 'A', tutorId: 1 },
      { id: 5, nombre: 'M5', carrera: null, tutorId: 1 },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }, { id: 11, nombre: 'B' }]);

    expect(component.carreras).toEqual(['B']);
  });

  it('materiasDeCarrera and selectedMateria should cover branches', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([{ id: 1, nombre: 'M1', carrera: 'A', tutorId: null }]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = '';
    expect(component.materiasDeCarrera).toEqual([]);
    expect(component.selectedMateria).toBeNull();

    component.carreraAsignacion = 'A';
    component.catalogoMaterias['A'] = [{ id: 1, nombre: 'M1' }, { id: 2, nombre: 'M2' }];
    expect(component.materiasDeCarrera.map(x => x.id)).toEqual([2]);

    component.materiaAsignacionId = 2;
    expect(component.selectedMateria?.id).toBe(2);

    component.materiaAsignacionId = 99;
    expect(component.selectedMateria).toBeNull();
  });

  it('materiasDeCarrera should fallback to empty when catalogoMaterias entry is missing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([{ id: 1, nombre: 'M1', carrera: 'A', tutorId: null }]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    delete component.catalogoMaterias['A'];
    expect(component.materiasDeCarrera).toEqual([]);
  });

  it('selectedMateria should return null when catalogoMaterias entry is missing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.materiaAsignacionId = 1;
    delete component.catalogoMaterias['A'];
    expect(component.selectedMateria).toBeNull();
  });

  it('selectedMateria should return null when materiaAsignacionId is null (even if carreraAsignacion exists)', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.materiaAsignacionId = null;
    component.catalogoMaterias['A'] = [{ id: 1, nombre: 'M1' }];
    expect(component.selectedMateria).toBeNull();
  });

  it('onChangeCarreraAsignacion should reset and handle missing careerId', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    component.carreraAsignacion = 'X';
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 2;
    component.onChangeCarreraAsignacion();
    expect(component.tutorAsignacionId).toBeNull();
    expect(component.catalogoMaterias['X']).toEqual([]);
    expect(component.materiasCat).toEqual([]);
    expect(component.materiaAsignacionId).toBeNull();
  });

  it('onChangeCarreraAsignacion should treat careerId=0 as missing and early return', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 0, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.onChangeCarreraAsignacion();
    expect(component.materiasCat).toEqual([]);
    expect(component.materiaAsignacionId).toBeNull();
    expect(httpMock.match(req => req.url.includes('/api/vicerrector/materias-catalogo')).length).toBe(0);
  });

  it('onChangeCarreraAsignacion should handle empty carreraAsignacion (no request)', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = '';
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 1;
    component.onChangeCarreraAsignacion();

    expect(component.tutorAsignacionId).toBeNull();
    expect(component.materiasCat).toEqual([]);
    expect(component.materiaAsignacionId).toBeNull();
    expect(httpMock.match(req => req.url.includes('/api/vicerrector/materias-catalogo')).length).toBe(0);
  });

  it('onChangeCarreraAsignacion should fetch materias-catalogo and set first materia id', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.onChangeCarreraAsignacion();
    httpMock.expectOne('/api/vicerrector/materias-catalogo?careerId=10').flush([{ id: 1, nombre: 'M1' }]);
    expect(component.materiaAsignacionId).toBe(1);
  });

  it('onChangeCarreraAsignacion should handle non-array materias-catalogo response', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.onChangeCarreraAsignacion();
    httpMock.expectOne('/api/vicerrector/materias-catalogo?careerId=10').flush({});
    expect(component.materiasCat).toEqual([]);
    expect(component.catalogoMaterias['A']).toEqual([]);
    expect(component.materiaAsignacionId).toBeNull();
  });

  it('onChangeCarreraAsignacion should set materiaAsignacionId null when no materias', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.onChangeCarreraAsignacion();
    httpMock.expectOne('/api/vicerrector/materias-catalogo?careerId=10').flush([]);
    expect(component.materiaAsignacionId).toBeNull();
  });

  it('onChangeMateriaAsignacion should reset tutorAsignacionId', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    component.tutorAsignacionId = 1;
    component.onChangeMateriaAsignacion();
    expect(component.tutorAsignacionId).toBeNull();
  });

  it('nombreDocente should handle null and missing docente', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.nombreDocente(null)).toBe('-');
    expect(component.nombreDocente(0)).toBe('-');
    expect(component.nombreDocente(99)).toBe('-');
    expect(component.nombreDocente(1)).toBe('D1');
  });

  it('nombreDocente should fallback to - when docente nombre is empty/undefined', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 2, nombre: '' }, { id: 3, nombre: undefined as any }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.nombreDocente(2)).toBe('-');
    expect(component.nombreDocente(3)).toBe('-');
  });

  it('editar should enable editing and copy tutor to seleccionarTutorId', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    const m: any = { tutorId: 2 };
    component.editar(m);
    expect(m.editing).toBeTrue();
    expect(m.seleccionarTutorId).toBe(2);
  });

  it('editar should set seleccionarTutorId to null when tutorId is undefined', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    const m: any = { tutorId: undefined };
    component.editar(m);
    expect(m.seleccionarTutorId).toBeNull();
  });

  it('guardar should set toast ok/error and stop editing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    const m: any = { id: 1, tutorId: null, seleccionarTutorId: 2, editing: true };
    component.guardar(m);
    httpMock.expectOne('/api/vicerrector/complexivo/materias/1/tutor').flush({});
    expect(m.tutorId).toBe(2);
    expect(m.editing).toBeFalse();
    expect(component.toastOk).toBeTrue();

    const m2: any = { id: 2, tutorId: null, seleccionarTutorId: 3, editing: true };
    component.guardar(m2);
    httpMock.expectOne('/api/vicerrector/complexivo/materias/2/tutor').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.toastOk).toBeFalse();
  });

  it('guardar should send tutorId null when seleccionarTutorId is undefined', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    const m: any = { id: 5, tutorId: 9, seleccionarTutorId: undefined, editing: true };
    component.guardar(m);
    const req = httpMock.expectOne('/api/vicerrector/complexivo/materias/5/tutor');
    expect(req.request.body).toEqual({ tutorId: null });
    req.flush({});
    expect(m.tutorId).toBeNull();
    expect(m.editing).toBeFalse();
  });

  it('guardar should send tutorId 0 when seleccionarTutorId is 0', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    const m: any = { id: 6, tutorId: 9, seleccionarTutorId: 0, editing: true };
    component.guardar(m);
    const req = httpMock.expectOne('/api/vicerrector/complexivo/materias/6/tutor');
    expect(req.request.body).toEqual({ tutorId: 0 });
    req.flush({});
    expect(m.tutorId).toBe(0);
    expect(m.editing).toBeFalse();
  });

  it('cargar should map carrera to null when backend returns undefined', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: undefined, tutorId: null },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);
    expect(component.registros[0].carrera).toBeNull();
  });

  it('agregarRegistro should early return on invalid inputs', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);

    component.carreraAsignacion = 'A';
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);

    component.materiaAsignacionId = 1;
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);

    component.tutorAsignacionId = 1;
    component.catalogoMaterias['A'] = [];
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);
  });

  it('agregarRegistro should early return when limiteAlcanzado or selectedMateria/careerId missing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([
      { id: 1, nombre: 'M1', carrera: 'A', tutorId: 1 },
      { id: 2, nombre: 'M2', carrera: 'A', tutorId: 1 },
      { id: 3, nombre: 'M3', carrera: 'A', tutorId: 1 },
      { id: 4, nombre: 'M4', carrera: 'A', tutorId: 1 },
    ]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.catalogoMaterias['A'] = [{ id: 1, nombre: 'M1' }];
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 1;
    expect(component.limiteAlcanzado).toBeTrue();
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);

    component.registros = [];
    component.materiaAsignacionId = 99;
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);

    component.carreraAsignacion = 'X';
    component.catalogoMaterias['X'] = [{ id: 1, nombre: 'M1' }];
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 1;
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);
  });

  it('agregarRegistro should early return when careerId is 0 (falsy)', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 0, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.catalogoMaterias['A'] = [{ id: 1, nombre: 'M1' }];
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 1;
    component.agregarRegistro();
    expect(httpMock.match('/api/vicerrector/complexivo/materias').length).toBe(0);
  });

  it('agregarRegistro should post and refresh on success and show error on failure', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    component.carreraAsignacion = 'A';
    component.catalogoMaterias['A'] = [{ id: 1, nombre: 'M1' }];
    component.materiaAsignacionId = 1;
    component.tutorAsignacionId = 1;

    component.agregarRegistro();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush({});
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    expect(component.toastOk).toBeTrue();

    component.agregarRegistro();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.toastOk).toBeFalse();
  });

  it('opcionesDocentesPara should exclude current tutor when not editing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }, { id: 2, nombre: 'D2' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.opcionesDocentesPara({ tutorId: 1, editing: false }).map(x => x.id)).toEqual([2]);
    expect(component.opcionesDocentesPara({ tutorId: 1, editing: true }).map(x => x.id)).toEqual([1, 2]);
    expect(component.opcionesDocentesTop().map(x => x.id)).toEqual([1, 2]);
  });

  it('opcionesDocentesPara should include all docentes when tutorId is null and not editing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }, { id: 2, nombre: 'D2' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.opcionesDocentesPara({ tutorId: null, editing: false }).map(x => x.id)).toEqual([1, 2]);
  });

  it('opcionesDocentesPara should include all docentes when tutorId is undefined and not editing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 1, nombre: 'D1' }, { id: 2, nombre: 'D2' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.opcionesDocentesPara({ tutorId: undefined as any, editing: false }).map(x => x.id)).toEqual([1, 2]);
  });

  it('opcionesDocentesPara should exclude tutorId 0 when not editing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([{ id: 0, nombre: 'D0' }, { id: 1, nombre: 'D1' }]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    expect(component.opcionesDocentesPara({ tutorId: 0, editing: false }).map(x => x.id)).toEqual([1]);
  });

  it('publicarTodo should early return without careerId', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([]);

    component.carreraAsignacion = 'X';
    component.publicarTodo();

    expect(httpMock.match('/api/vicerrector/complexivo/materias/publicar').length).toBe(0);
  });

  it('publicarTodo should early return when careerId is 0 (falsy)', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 0, nombre: 'A' }]);

    component.carreraAsignacion = 'A';
    component.publicarTodo();
    expect(httpMock.match('/api/vicerrector/complexivo/materias/publicar').length).toBe(0);
  });

  it('publicarTodo should post and show toast ok/error', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/complexivo/materias').flush([]);
    httpMock.expectOne('/api/vicerrector/docentes').flush([]);
    httpMock.expectOne('/api/vicerrector/carreras').flush([{ id: 10, nombre: 'A' }]);

    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    component.carreraAsignacion = 'A';
    component.publicarTodo();
    httpMock.expectOne('/api/vicerrector/complexivo/materias/publicar').flush({ published: 3 });
    expect(component.toastOk).toBeTrue();

    component.publicarTodo();
    httpMock.expectOne('/api/vicerrector/complexivo/materias/publicar').flush({ published: 0 });
    expect(component.toastOk).toBeTrue();
    expect(component.toastMsg).toContain('0');

    component.publicarTodo();
    httpMock.expectOne('/api/vicerrector/complexivo/materias/publicar').flush({});
    expect(component.toastOk).toBeTrue();

    component.publicarTodo();
    httpMock.expectOne('/api/vicerrector/complexivo/materias/publicar').flush(null);
    expect(component.toastOk).toBeTrue();

    component.publicarTodo();
    httpMock.expectOne('/api/vicerrector/complexivo/materias/publicar').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.toastOk).toBeFalse();
  });
});
