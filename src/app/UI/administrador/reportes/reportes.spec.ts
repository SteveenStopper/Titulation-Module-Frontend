import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, skip, take } from 'rxjs';

import { Reportes } from './reportes';
import { PeriodService } from '../../../services/period.service';

describe('Reportes', () => {
  let component: Reportes;
  let fixture: ComponentFixture<Reportes>;
  let httpMock: HttpTestingController;
  let periodSvcMock: { listAll: jasmine.Spy; getActivePeriod: jasmine.Spy };

  function createComponent() {
    fixture = TestBed.createComponent(Reportes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    periodSvcMock = {
      listAll: jasmine.createSpy('listAll').and.returnValue(of([])),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue(''),
    };

    await TestBed.configureTestingModule({
      imports: [Reportes, HttpClientTestingModule],
      providers: [
        {
          provide: PeriodService,
          useValue: periodSvcMock,
        },
      ],
    })
      .overrideComponent(Reportes, { set: { template: '' } })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should preselect active period when matching period name exists', () => {
    periodSvcMock.getActivePeriod.and.returnValue('P Activo');
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 7, name: 'P Activo' },
      { id_academic_periods: 8, name: 'Otro' },
    ]));

    createComponent();
    expect(component.selectedPeriodId$.value).toBe(7);
  });

  it('should update selectedPeriodId onChangePeriod', () => {
    createComponent();
    component.onChangePeriod({ target: { value: '12' } } as any);
    expect(component.selectedPeriodId$.value).toBe(12);
  });

  it('should update selectedCareerId onChangeCareer', () => {
    createComponent();
    component.onChangeCareer({ target: { value: '5' } } as any);
    expect(component.selectedCareerId$.value).toBe(5);
  });

  it('onChangePeriod/onChangeCareer should set null when empty', () => {
    createComponent();
    component.onChangePeriod({ target: { value: '' } } as any);
    component.onChangeCareer({ target: { value: '' } } as any);
    expect(component.selectedPeriodId$.value).toBeNull();
    expect(component.selectedCareerId$.value).toBeNull();
  });

  it('selectedPeriodLabel$ and selectedCareerLabel$ should return defaults when no selection', (done) => {
    createComponent();
    let pOk = false;
    let cOk = false;
    component.selectedPeriodLabel$.pipe(take(1)).subscribe((v) => {
      expect(v).toBe('Activo');
      pOk = true;
      if (pOk && cOk) done();
    });
    component.selectedCareerLabel$.pipe(take(1)).subscribe((v) => {
      expect(v).toBe('Todas');
      cOk = true;
      if (pOk && cOk) done();
    });

    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
  });

  it('dash/sinTutor/conTutor should call endpoints without query when pid and cid are null', (done) => {
    createComponent();

    let dOk = false;
    let sOk = false;
    let cOk = false;

    component.dash$.pipe(skip(1), take(1)).subscribe((v) => { expect(v).toBeTruthy(); dOk = true; if (dOk && sOk && cOk) done(); });
    component.sinTutor$.pipe(skip(1), take(1)).subscribe((v) => { expect(Array.isArray(v)).toBeTrue(); sOk = true; if (dOk && sOk && cOk) done(); });
    component.conTutor$.pipe(skip(1), take(1)).subscribe((v) => { expect(Array.isArray(v)).toBeTrue(); cOk = true; if (dOk && sOk && cOk) done(); });

    httpMock.expectOne('/api/uic/admin/dashboard').flush({});
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor').flush([]);
  });

  it('should build dash request with academicPeriodId when selected', (done) => {
    createComponent();

    component.selectedPeriodId$.next(10);

    component.dash$.subscribe((v) => {
      if (!v) return;
      if (v.totalEnProceso !== 3) return;
      expect(v).toEqual({ totalEnProceso: 3, uicPercent: 40, complexivoPercent: 60 });
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10')
      .flush({ totalEnProceso: 3, uicPercent: 40, complexivoPercent: 60 });
  });

  it('should build sinTutor and conTutor requests with academicPeriodId and careerId', (done) => {
    createComponent();

    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(5);

    let sinOk = false;
    let conOk = false;

    component.sinTutor$.pipe(skip(1), take(1)).subscribe((list) => {
      expect(Array.isArray(list)).toBeTrue();
      expect(list.length).toBe(1);
      sinOk = true;
      if (sinOk && conOk) done();
    });
    component.conTutor$.pipe(skip(1), take(1)).subscribe((list) => {
      expect(Array.isArray(list)).toBeTrue();
      expect(list.length).toBe(2);
      conOk = true;
      if (sinOk && conOk) done();
    });

    httpMock
      .expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10&careerId=5')
      .flush([{ fullname: 'A' }]);
    httpMock
      .expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10&careerId=5')
      .flush([{ fullname: 'B' }, { fullname: 'C' }]);
  });

  it('should recover with empty lists on sinTutor/conTutor errors', (done) => {
    createComponent();

    component.selectedPeriodId$.next(10);

    let sinOk = false;
    let conOk = false;

    component.sinTutor$.pipe(skip(1), take(1)).subscribe((list) => {
      expect(Array.isArray(list)).toBeTrue();
      expect(list.length).toBe(0);
      sinOk = true;
      if (sinOk && conOk) done();
    });
    component.conTutor$.pipe(skip(1), take(1)).subscribe((list) => {
      expect(Array.isArray(list)).toBeTrue();
      expect(list.length).toBe(0);
      conOk = true;
      if (sinOk && conOk) done();
    });

    httpMock
      .expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10')
      .flush('X', { status: 500, statusText: 'Server Error' });
    httpMock
      .expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10')
      .flush('X', { status: 500, statusText: 'Server Error' });
  });

  it('should export report and write html to new window', async () => {
    createComponent();
    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(5);

    const doc = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
      write: jasmine.createSpy('write'),
    };
    const w: any = { document: doc };
    spyOn(window, 'open').and.returnValue(w);

    const p = component.onExportReport();

    httpMock.expectOne('/api/uic/admin/carreras').flush([{ id: 5, nombre: 'Sistemas' }]);

    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10').flush({ totalEnProceso: 10, uicPercent: 60, complexivoPercent: 40 });
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10&careerId=5').flush([{ fullname: 'A', career_name: 'Sistemas' }]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10&careerId=5').flush([{ fullname: 'B', tutor_name: 'T' }]);

    await p;
    expect(window.open).toHaveBeenCalled();
    expect(doc.open).toHaveBeenCalled();
    expect(doc.close).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalled();
  });

  it('should return early when window.open fails', async () => {
    createComponent();
    spyOn(window, 'open').and.returnValue(null);
    await component.onExportReport();
    expect(window.open).toHaveBeenCalled();
  });

  it('should write error page when export throws', async () => {
    createComponent();
    const doc = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
      write: jasmine.createSpy('write'),
    };
    const w: any = { document: doc };
    spyOn(window, 'open').and.returnValue(w);
    spyOn<any>(Promise, 'all').and.returnValue(Promise.reject(new Error('fail')));

    const p = component.onExportReport();
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 });
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor').flush([]);
    await p;
    expect(doc.open).toHaveBeenCalled();
    expect(doc.close).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalled();
  });

  it('should export report and include "No hay registros." when lists are empty', async () => {
    createComponent();
    component.selectedPeriodId$.next(null);
    component.selectedCareerId$.next(null);

    const doc = {
      open: jasmine.createSpy('open'),
      close: jasmine.createSpy('close'),
      write: jasmine.createSpy('write'),
    };
    const w: any = { document: doc };
    spyOn(window, 'open').and.returnValue(w);

    const p = component.onExportReport();

    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 });
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor').flush([]);

    await p;
    const html = doc.write.calls.allArgs().map(a => String(a[0])).join('\n');
    expect(html).toContain('No hay registros.');
  });
});
