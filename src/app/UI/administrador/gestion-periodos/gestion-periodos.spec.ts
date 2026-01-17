import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GestionPeriodos } from './gestion-periodos';
import { PeriodService } from '../../../services/period.service';

describe('GestionPeriodos', () => {
  let component: GestionPeriodos;
  let fixture: ComponentFixture<GestionPeriodos>;
  let periodSvcMock: {
    listAll: jasmine.Spy;
    createPeriod: jasmine.Spy;
    updatePeriod: jasmine.Spy;
    setActivePeriodBackend: jasmine.Spy;
    closePeriod: jasmine.Spy;
    fetchAndSetFromBackend: jasmine.Spy;
  };

  function createComponent() {
    fixture = TestBed.createComponent(GestionPeriodos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    periodSvcMock = {
      listAll: jasmine.createSpy('listAll').and.returnValue(of([])),
      createPeriod: jasmine.createSpy('createPeriod').and.returnValue(of({ id_academic_periods: 1, name: 'P1' })),
      updatePeriod: jasmine.createSpy('updatePeriod').and.returnValue(of({})),
      setActivePeriodBackend: jasmine.createSpy('setActivePeriodBackend').and.returnValue(of({})),
      closePeriod: jasmine.createSpy('closePeriod').and.returnValue(of({})),
      fetchAndSetFromBackend: jasmine.createSpy('fetchAndSetFromBackend').and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [GestionPeriodos, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: PeriodService,
          useValue: periodSvcMock,
        },
      ],
    })
    .compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem('admin_periodos');
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should load from backend and map rows', () => {
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 10, name: 'A', date_start: '2024-01-01', date_end: '2024-06-01', status: 'activo' },
      { id_academic_periods: 11, name: 'B', date_start: null, date_end: null, status: 'cerrado' },
      { id_academic_periods: 12, name: 'C', date_start: '', date_end: '', status: 'inactivo' },
      { id_academic_periods: 13, name: 'D', date_start: '', date_end: '', status: 'otro' },
    ]));

    createComponent();
    expect(component.periodos.length).toBe(4);
    expect(component.periodos[0].estado).toBe('activo');
    expect(component.periodos[1].estado).toBe('cerrado');
    expect(component.periodos[2].estado).toBe('cerrado');
    expect(component.periodos[3].estado).toBe('borrador');
  });

  it('should expose activoActual', () => {
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 10, name: 'A', date_start: '', date_end: '', status: 'activo' },
      { id_academic_periods: 11, name: 'B', date_start: '', date_end: '', status: 'cerrado' },
    ]));
    createComponent();
    expect(component.activoActual?.id).toBe('10');
  });

  it('should filter periodosFiltrados (empty query returns all)', () => {
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 1, name: 'Periodo Uno', date_start: '', date_end: '', status: 'otro' },
      { id_academic_periods: 2, name: 'Periodo Dos', date_start: '', date_end: '', status: 'otro' },
    ]));
    createComponent();
    component.filtro = '';
    expect(component.periodosFiltrados.length).toBe(2);
  });

  it('should filter periodosFiltrados (query filters by nombre)', () => {
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 1, name: 'Periodo Uno', date_start: '', date_end: '', status: 'otro' },
      { id_academic_periods: 2, name: 'Otro', date_start: '', date_end: '', status: 'otro' },
    ]));
    createComponent();
    component.filtro = 'uno';
    expect(component.periodosFiltrados.map(p => p.id)).toEqual(['1']);
  });

  it('abrirCrear should open modal and set new form id', () => {
    createComponent();
    spyOn(Math, 'random').and.returnValue(0.123456);
    component.abrirCrear();
    expect(component.isModalOpen).toBeTrue();
    expect(component.isEditing).toBeFalse();
    expect(component.form.id).toContain('p-');
  });

  it('abrirEditar should open modal with existing values', () => {
    createComponent();
    component.abrirEditar({ id: '99', nombre: 'X', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' });
    expect(component.isModalOpen).toBeTrue();
    expect(component.isEditing).toBeTrue();
    expect(component.form).toEqual({ id: '99', nombre: 'X', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' });
  });

  it('guardarFormulario should validate required nombre', () => {
    createComponent();
    component.isEditing = false;
    component.form = { id: '1', nombre: '  ', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' };
    component.guardarFormulario();
    expect(component.formError).toBe('El nombre es obligatorio');
  });

  it('guardarFormulario should validate required fechas', () => {
    createComponent();
    component.isEditing = false;
    component.form = { id: '1', nombre: 'X', fechaInicio: '', fechaFin: '' };
    component.guardarFormulario();
    expect(component.formError).toBe('Las fechas son obligatorias');
  });

  it('guardarFormulario should validate fechaInicio <= fechaFin', () => {
    createComponent();
    component.isEditing = false;
    component.form = { id: '1', nombre: 'X', fechaInicio: '2024-02-01', fechaFin: '2024-01-01' };
    component.guardarFormulario();
    expect(component.formError).toBe('La fecha de inicio no puede ser mayor que la fecha de fin');
  });

  it('guardarFormulario should reject duplicate nombre when creating', () => {
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 1, name: 'Duplicado', date_start: '', date_end: '', status: 'otro' },
    ]));
    createComponent();
    component.isEditing = false;
    component.form = { id: '2', nombre: 'duplicado', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' };
    component.guardarFormulario();
    expect(component.formError).toBe('Ya existe un período con ese nombre');
    expect(periodSvcMock.createPeriod).not.toHaveBeenCalled();
  });

  it('guardarFormulario should create on backend and persist (dd/mm/yyyy normalization)', () => {
    createComponent();
    component.isEditing = false;
    component.abrirCrear();
    component.form = { id: 'tmp', nombre: 'Nuevo', fechaInicio: '01/02/2024', fechaFin: '03/04/2024' };
    periodSvcMock.createPeriod.and.returnValue(of({ id_academic_periods: 99, name: 'Nuevo' }));

    component.guardarFormulario();
    expect(periodSvcMock.createPeriod).toHaveBeenCalledWith({
      name: 'Nuevo',
      date_start: '2024-02-01',
      date_end: '2024-04-03',
    });
    expect(component.periodos.some(p => p.id === '99')).toBeTrue();
    expect(component.isModalOpen).toBeFalse();
    expect(localStorage.getItem('admin_periodos')).toContain('Nuevo');
  });

  it('guardarFormulario should set formError on create error', () => {
    createComponent();
    component.isEditing = false;
    component.form = { id: 'tmp', nombre: 'Nuevo', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' };
    periodSvcMock.createPeriod.and.returnValue(throwError(() => ({ error: { message: 'X' } })));

    component.guardarFormulario();
    expect(component.formError).toBe('X');
    expect(component.isModalOpen).toBeFalse();
  });

  it('guardarFormulario should update on backend, refresh list, and persist', () => {
    periodSvcMock.listAll.and.returnValues(
      of([{ id_academic_periods: 1, name: 'A', date_start: '2024-01-01', date_end: '2024-02-01', status: 'otro' }]),
      of([{ id_academic_periods: 1, name: 'A2', date_start: '2024-01-01', date_end: '2024-02-01', status: 'otro' }]),
    );
    createComponent();

    component.isEditing = true;
    component.isModalOpen = true;
    component.form = { id: '1', nombre: 'A2', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' };

    component.guardarFormulario();
    expect(periodSvcMock.updatePeriod).toHaveBeenCalledWith(1, {
      name: 'A2',
      date_start: '2024-01-01',
      date_end: '2024-02-01',
    });
    expect(component.periodos[0].nombre).toBe('A2');
    expect(component.isModalOpen).toBeFalse();
    expect(localStorage.getItem('admin_periodos')).toContain('A2');
  });

  it('guardarFormulario should set formError on update error', () => {
    createComponent();
    component.isEditing = true;
    component.form = { id: '1', nombre: 'A2', fechaInicio: '2024-01-01', fechaFin: '2024-02-01' };
    periodSvcMock.updatePeriod.and.returnValue(throwError(() => ({ error: { message: 'U' } })));

    component.guardarFormulario();
    expect(component.formError).toBe('U');
  });

  it('activar should do nothing when confirm is false', () => {
    createComponent();
    spyOn(window, 'confirm').and.returnValue(false);
    component.activar({ id: '1', nombre: 'A' });
    expect(periodSvcMock.setActivePeriodBackend).not.toHaveBeenCalled();
  });

  it('activar should call backend, refresh list, persist, and refresh active period', () => {
    periodSvcMock.listAll.and.returnValues(
      of([{ id_academic_periods: 1, name: 'A', date_start: '', date_end: '', status: 'otro' }]),
      of([{ id_academic_periods: 1, name: 'A', date_start: '', date_end: '', status: 'activo' }]),
    );
    createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    component.activar({ id: '1', nombre: 'A' });
    expect(periodSvcMock.setActivePeriodBackend).toHaveBeenCalledWith(1, 'A');
    expect(component.periodos[0].estado).toBe('activo');
    expect(localStorage.getItem('admin_periodos')).toContain('"activo"');
    expect(periodSvcMock.fetchAndSetFromBackend).toHaveBeenCalled();
  });

  it('activar should alert on backend error', () => {
    createComponent();
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    periodSvcMock.setActivePeriodBackend.and.returnValue(throwError(() => ({ error: { message: 'E' } })));

    component.activar({ id: '1', nombre: 'A' });
    expect(window.alert).toHaveBeenCalled();
  });

  it('cerrar should do nothing when confirm is false', () => {
    createComponent();
    spyOn(window, 'confirm').and.returnValue(false);
    component.cerrar({ id: '1', nombre: 'A' });
    expect(periodSvcMock.closePeriod).not.toHaveBeenCalled();
  });

  it('cerrar should call backend, refresh list, persist, and refresh active period', () => {
    periodSvcMock.listAll.and.returnValues(
      of([{ id_academic_periods: 1, name: 'A', date_start: '', date_end: '', status: 'activo' }]),
      of([{ id_academic_periods: 1, name: 'A', date_start: '', date_end: '', status: 'cerrado' }]),
    );
    createComponent();
    spyOn(window, 'confirm').and.returnValue(true);

    component.cerrar({ id: '1', nombre: 'A' });
    expect(periodSvcMock.closePeriod).toHaveBeenCalledWith(1);
    expect(component.periodos[0].estado).toBe('cerrado');
    expect(localStorage.getItem('admin_periodos')).toContain('"cerrado"');
    expect(periodSvcMock.fetchAndSetFromBackend).toHaveBeenCalled();
  });

  it('cerrar should alert on backend error', () => {
    createComponent();
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');
    periodSvcMock.closePeriod.and.returnValue(throwError(() => ({ message: 'E' })));

    component.cerrar({ id: '1', nombre: 'A' });
    expect(window.alert).toHaveBeenCalled();
  });

  it('should load from localStorage if present', () => {
    localStorage.setItem('admin_periodos', JSON.stringify([
      { id: 'L1', nombre: 'Local', fechaInicio: '2024-01-01', fechaFin: '2024-02-01', estado: 'borrador' },
    ]));
    periodSvcMock.listAll.and.returnValue(of(null as any));
    createComponent();
    expect(component.periodos.some(p => p.id === 'L1')).toBeTrue();
  });

  it('cerrarModal should close modal', () => {
    createComponent();
    component.isModalOpen = true;
    component.cerrarModal();
    expect(component.isModalOpen).toBeFalse();
  });
});
