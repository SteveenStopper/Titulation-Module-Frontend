import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { VeedorExamenComplexivo } from './veedor-examen-complexivo';
import { PeriodService } from '../../../services/period.service';

describe('VeedorExamenComplexivo', () => {
  let component: VeedorExamenComplexivo;
  let fixture: ComponentFixture<VeedorExamenComplexivo>;
  let httpMock: any;

  beforeEach(async () => {
    httpMock = {
      get: jasmine.createSpy('get').and.callFake((url: string) => {
        if (url === '/api/settings/active-period') return of({ id_academic_periods: 1 });
        if (url === '/api/uic/admin/carreras') return of([]);
        if (url === '/api/complexivo/docentes') return of([]);
        if (url === '/api/uic/admin/docentes') return of([]);
        if (url === '/api/complexivo/veedores') return of([]);
        return of([]);
      }),
      put: jasmine.createSpy('put').and.returnValue(of({})),
      post: jasmine.createSpy('post').and.returnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [VeedorExamenComplexivo],
      providers: [
        {
          provide: PeriodService,
          useValue: { listAll: () => of([]) },
        },
        {
          provide: HttpClient,
          useValue: httpMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(VeedorExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('addCarrera/removeCarrera should manage materias and enforce max 4', () => {
    component.model.materias = [];
    component.addCarrera();
    component.addCarrera();
    component.addCarrera();
    component.addCarrera();
    component.addCarrera();
    expect(component.model.materias.length).toBe(4);
    component.removeCarrera(1);
    expect(component.model.materias.length).toBe(3);
  });

  it('getAvailableVeedores should exclude used in other rows', () => {
    component.veedoresDisponibles = [{ id_user: 1, fullname: 'A' }, { id_user: 2, fullname: 'B' }] as any;
    component.model.materias = [
      { veedor1Id: 1 } as any,
      { veedor1Id: undefined, veedor2Id: undefined } as any,
    ];
    const avail = component.getAvailableVeedores(1, 1);
    expect(avail.map(v => v.id_user)).toEqual([2]);
  });

  it('onChangeVeedores should prevent selecting same docente in both slots', () => {
    component.model.materias = [{ veedor1Id: 1, veedor2Id: 1 } as any];
    component.onChangeVeedores(0);
    expect(component.model.materias[0].veedor2Id).toBeUndefined();
  });

  it('onChangePeriodo should force active period and load assignments', () => {
    component.activePeriodId = 1;
    component.model.periodoId = 2;
    component.onChangePeriodo();
    expect(component.model.periodoId).toBe(1);
  });

  it('guardar should block when period is not active', () => {
    component.activePeriodId = 1;
    component.model.periodoId = 2;
    component.model.materias = [{ carreraId: 1, veedor1Id: 2 } as any];
    component.guardar();
    expect(component.error).toBe('Solo se permite guardar en el período activo.');
  });

  it('guardar should run forkJoin and set message on success', () => {
    component.activePeriodId = 1;
    component.model.periodoId = 1;
    component.model.materias = [{ carreraId: 1, veedor1Id: 2, veedor2Id: 3 } as any];
    component.guardar();
    expect(httpMock.put).toHaveBeenCalled();
    expect(component.message).toBe('Asignación de veedores guardada correctamente.');
  });

  it('guardar should set error on backend error', () => {
    httpMock.put.and.returnValue(throwError(() => ({ error: { message: 'E' } })));
    component.activePeriodId = 1;
    component.model.periodoId = 1;
    component.model.materias = [{ carreraId: 1, veedor1Id: 2 } as any];
    component.guardar();
    expect(component.error).toBe('E');
  });
});
