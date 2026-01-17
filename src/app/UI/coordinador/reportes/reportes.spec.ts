import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { combineLatest, of, skip, take, throwError } from 'rxjs';

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
    periodSvcMock.listAll.and.returnValue(of([{ id_academic_periods: 10, name: 'P Activo' } as any]));
    createComponent();
    expect(component.selectedPeriodId$.value).toBe(10);
  });

  it('periods$ and careers$ should recover with empty arrays on error', (done) => {
    periodSvcMock.listAll.and.returnValue(throwError(() => new Error('x')));
    createComponent();

    let pOk = false;
    let cOk = false;

    component.periods$.pipe(take(1)).subscribe((rows) => {
      expect(rows).toEqual([]);
      pOk = true;
      if (pOk && cOk) done();
    });
    component.careers$.pipe(take(1)).subscribe((rows) => {
      expect(rows).toEqual([]);
      cOk = true;
      if (pOk && cOk) done();
    });

    httpMock.expectOne('/api/uic/admin/carreras').flush('X', { status: 500, statusText: 'Server Error' });
  });

  it('onChangePeriod and onChangeCareer should update selected ids', () => {
    createComponent();
    component.onChangePeriod({ target: { value: '10' } } as any);
    component.onChangeCareer({ target: { value: '5' } } as any);
    expect(component.selectedPeriodId$.value).toBe(10);
    expect(component.selectedCareerId$.value).toBe(5);
  });

  it('onChangePeriod/onChangeCareer should set null when empty value', () => {
    createComponent();
    component.onChangePeriod({ target: { value: '' } } as any);
    component.onChangeCareer({ target: { value: '' } } as any);
    expect(component.selectedPeriodId$.value).toBeNull();
    expect(component.selectedCareerId$.value).toBeNull();
  });

  it('dash$ should request dashboard without query when period is null', (done) => {
    createComponent();
    component.selectedPeriodId$.next(null);
    component.dash$.pipe(skip(1), take(1)).subscribe((dash) => {
      expect(dash).toBeTruthy();
      done();
    });
    httpMock.expectOne('/api/uic/admin/dashboard').flush({});
  });

  it('dash$ should request dashboard with academicPeriodId and map values (and catch error)', (done) => {
    createComponent();

    component.selectedPeriodId$.next(10);

    component.dash$.pipe(skip(1), take(1)).subscribe((dash) => {
      expect(dash.totalEnProceso).toBe(3);
      expect(dash.sinTutor).toBe(1);
      expect(dash.totalEstudiantes).toBe(9);
      expect(dash.uicPercent).toBe(60);
      expect(dash.complexivoPercent).toBe(40);
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10')
      .flush({ totalEnProceso: 3, sinTutor: 1, totalEstudiantes: 9, uicPercent: 60, complexivoPercent: 40 });
  });

  it('sinTutor$ and conTutor$ should include query params and recover on error', (done) => {
    createComponent();

    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(5);

    combineLatest([
      component.sinTutor$.pipe(skip(1), take(1)),
      component.conTutor$.pipe(skip(1), take(1)),
    ]).subscribe(([sinList, conList]) => {
      expect(Array.isArray(sinList)).toBeTrue();
      expect(sinList.length).toBe(1);
      expect(Array.isArray(conList)).toBeTrue();
      expect(conList.length).toBe(0);
      done();
    });

    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10&careerId=5').flush([{ id_user: 1 }]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10&careerId=5')
      .flush('X', { status: 500, statusText: 'Server Error' });
  });

  it('exportKpisCsv should call downloadCsv', async () => {
    createComponent();
    spyOn<any>(component as any, 'downloadCsv');

    component.selectedPeriodId$.next(10);
    const p = component.exportKpisCsv();

    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10')
      .flush({ totalEnProceso: 3, sinTutor: 1, totalEstudiantes: 9, uicPercent: 60, complexivoPercent: 40 });

    await p;
    expect((component as any).downloadCsv).toHaveBeenCalled();
  });

  it('exportDetalleCsv should call downloadCsv', async () => {
    createComponent();
    spyOn<any>(component as any, 'downloadCsv');

    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(5);

    const p = component.exportDetalleCsv();

    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10&careerId=5').flush([{ fullname: 'A', career_name: 'C', suggested_tutor: 'S' }]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10&careerId=5').flush([{ fullname: 'B', career_name: 'C', tutor_name: 'T' }]);

    await p;
    expect((component as any).downloadCsv).toHaveBeenCalled();
  });

  it('printPdf should return early when window.open is null', async () => {
    createComponent();
    spyOn(window, 'open').and.returnValue(null);
    await component.printPdf();
    expect(window.open).toHaveBeenCalled();
  });

  it('printPdf should write and close document', async () => {
    periodSvcMock.getActivePeriod.and.returnValue('P Activo');
    periodSvcMock.listAll.and.returnValue(of([
      { id_academic_periods: 10, name: 'P Activo' },
    ]));

    createComponent();

    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(5);

    const doc = {
      write: jasmine.createSpy('write'),
      close: jasmine.createSpy('close'),
    };
    spyOn(window, 'open').and.returnValue({ document: doc } as any);

    const p = component.printPdf();

    httpMock.expectOne('/api/uic/admin/carreras').flush([{ id: 5, nombre: 'Sistemas' }]);
    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10')
      .flush({ totalEnProceso: 3, sinTutor: 1, totalEstudiantes: 9, uicPercent: 60, complexivoPercent: 40 });
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10&careerId=5').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10&careerId=5').flush([]);

    await p;
    expect(doc.write).toHaveBeenCalled();
    expect(doc.close).toHaveBeenCalled();
  });

  it('printPdf should render empty tables when there are no rows', async () => {
    periodSvcMock.getActivePeriod.and.returnValue('P Activo');
    periodSvcMock.listAll.and.returnValue(of([{ id_academic_periods: 10, name: 'P Activo' }]));
    createComponent();

    const doc = { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') };
    spyOn(window, 'open').and.returnValue({ document: doc } as any);
    component.selectedPeriodId$.next(10);
    component.selectedCareerId$.next(null);

    const p = component.printPdf();
    httpMock.expectOne('/api/uic/admin/carreras').flush([]);
    httpMock.expectOne('/api/uic/admin/dashboard?academicPeriodId=10').flush({});
    httpMock.expectOne('/api/uic/admin/estudiantes-sin-tutor?academicPeriodId=10').flush([]);
    httpMock.expectOne('/api/uic/admin/estudiantes-con-tutor?academicPeriodId=10').flush([]);

    await p;
    const html = doc.write.calls.mostRecent().args[0] as string;
    expect(html).toContain('Sin registros');
  });

  it('buildQuery should omit null/undefined/empty and encode params', () => {
    createComponent();
    const q1 = (component as any).buildQuery({ a: 1, b: null, c: undefined, d: '' });
    expect(q1).toBe('?a=1');
    const q2 = (component as any).buildQuery({ k: 'a b' });
    expect(q2).toBe('?k=a%20b');
  });

  it('downloadCsv should create a blob URL and click an anchor', () => {
    createComponent();
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    const objUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:1');

    const clickSpy = jasmine.createSpy('click');
    spyOn(document, 'createElement').and.callFake(() => ({
      set href(_v: string) {},
      set download(_v: string) {},
      click: clickSpy,
    } as any));

    (component as any).downloadCsv([["A"], ["B"]], 'x.csv');
    expect(objUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:1');
  });
});
