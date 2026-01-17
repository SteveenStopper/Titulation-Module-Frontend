import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { Reportes } from './reportes';
import { PeriodService } from '../../../services/period.service';

describe('Reportes', () => {
  let component: Reportes;
  let fixture: ComponentFixture<Reportes>;
  let httpMock: HttpTestingController;
  let periodMock: any;

  function createComponent() {
    fixture = TestBed.createComponent(Reportes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    periodMock = {
      listAll: () => of([]),
      getActivePeriod: () => '',
      activePeriod$: of(''),
    };
    await TestBed.configureTestingModule({
      imports: [Reportes, HttpClientTestingModule],
      providers: [
        {
          provide: PeriodService,
          useValue: periodMock,
        },
      ],
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInit(periodQuery = '') {
    httpMock.expectOne(`/api/vicerrector/reportes/resumen${periodQuery}`).flush({
      carrerasActivas: 1,
      materiasRegistradas: 2,
      publicables: 3,
      tutoresDisponibles: 4,
    });
    httpMock.expectOne(`/api/vicerrector/reportes/distribucion-carreras${periodQuery}`).flush([
      { carrera: 'A', registradas: 2, publicadas: 1 },
    ]);
    httpMock.expectOne(`/api/vicerrector/reportes/top-tutores${periodQuery}`).flush([
      { tutor: 'T', asignadas: 2 },
    ]);
  }

  it('should create', () => {
    createComponent();
    flushInit();
    expect(component).toBeTruthy();
  });

  it('should compute totalReg and pctPublicado branches', () => {
    createComponent();
    flushInit();
    expect(component.totalReg()).toBe(2);
    expect(component.pctPublicado({ registradas: 0, publicadas: 0 })).toBe(0);
    expect(component.pctPublicado({ registradas: 2, publicadas: 1 })).toBe(50);
  });

  it('should set periodOptionsPrint and selectedPeriodPrint from PeriodService', () => {
    periodMock.listAll = () => of([{ name: '2024-1' }, { name: '2024-2' }]);
    periodMock.getActivePeriod = () => '2024-1';
    periodMock.activePeriod$ = of('2024-2');

    createComponent();

    flushInit();
    expect(component.periodOptionsPrint).toEqual(['2024-1', '2024-2']);
    expect(component.selectedPeriodPrint).toBe('2024-1');
  });

  it('should not overwrite selectedPeriodPrint when activePeriod$ emits and selection already exists', () => {
    periodMock.getActivePeriod = () => '';
    periodMock.activePeriod$ = of('2024-2');

    createComponent();
    component.selectedPeriodPrint = '2024-9';
    fixture.detectChanges();

    flushInit();
    expect(component.selectedPeriodPrint).toBe('2024-9');
  });

  it('should set selectedPeriodPrint from activePeriod$ when it is initially empty', () => {
    periodMock.getActivePeriod = () => '';
    periodMock.activePeriod$ = of('2024-2');

    createComponent();
    flushInit();
    expect(component.selectedPeriodPrint).toBe('2024-2');
  });

  it('should keep selectedPeriodPrint undefined when activePeriod$ emits null and it is empty', () => {
    periodMock.getActivePeriod = () => '';
    periodMock.activePeriod$ = of(null);

    createComponent();
    flushInit();
    expect(component.selectedPeriodPrint).toBeUndefined();
  });

  it('should keep selectedPeriodPrint undefined when activePeriod$ emits empty string and it is empty', () => {
    periodMock.getActivePeriod = () => '';
    periodMock.activePeriod$ = of('');

    createComponent();
    flushInit();
    expect(component.selectedPeriodPrint).toBeUndefined();
  });

  it('onChangePeriodPrint should refetch with period query', () => {
    createComponent();
    flushInit();
    component.selectedPeriodPrint = '2024-2';
    component.onChangePeriodPrint();
    flushInit('?period=2024-2');
    expect(component.selectedPeriodPrint).toBe('2024-2');
  });

  it('onChangePeriodPrint should refetch without query when selectedPeriodPrint is undefined', () => {
    createComponent();
    flushInit();
    component.selectedPeriodPrint = undefined;
    component.onChangePeriodPrint();
    flushInit('');
    expect(component.selectedPeriodPrint).toBeUndefined();
  });

  it('should handle non-array responses for distribucion/top', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/reportes/resumen').flush({
      carrerasActivas: 0,
      materiasRegistradas: 0,
      publicables: 0,
      tutoresDisponibles: 0,
    });
    httpMock.expectOne('/api/vicerrector/reportes/distribucion-carreras').flush({});
    httpMock.expectOne('/api/vicerrector/reportes/top-tutores').flush({});
    expect(component.distribucionCarreras).toEqual([]);
    expect(component.topTutores).toEqual([]);
  });

  it('should map resumen using fallback zeros when fields are missing', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/reportes/resumen').flush({});
    httpMock.expectOne('/api/vicerrector/reportes/distribucion-carreras').flush([]);
    httpMock.expectOne('/api/vicerrector/reportes/top-tutores').flush([]);
    expect(component.resumen.every(x => x.valor === 0)).toBeTrue();
  });

  it('exportResumenCsv/exportDistribucionCsv/exportTopTutoresCsv should trigger download', () => {
    createComponent();
    flushInit();
    const anchor: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(anchor);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(URL, 'revokeObjectURL');

    component.exportResumenCsv();
    component.exportDistribucionCsv();
    component.exportTopTutoresCsv();

    expect(anchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('canExport getters should reflect data presence', () => {
    createComponent();
    flushInit();
    expect(component.canExportResumen).toBeTrue();
    expect(component.canExportDistribucion).toBeTrue();
    expect(component.canExportTop).toBeTrue();

    component.resumen = component.resumen.map(x => ({ ...x, valor: 0 }));
    component.distribucionCarreras = [];
    component.topTutores = [];
    expect(component.canExportResumen).toBeFalse();
    expect(component.canExportDistribucion).toBeFalse();
    expect(component.canExportTop).toBeFalse();
  });

  it('canExport getters should handle null arrays', () => {
    createComponent();
    flushInit();

    component.resumen = null as any;
    component.distribucionCarreras = null as any;
    component.topTutores = null as any;

    expect(component.canExportResumen).toBeFalse();
    expect(component.canExportDistribucion).toBeFalse();
    expect(component.canExportTop).toBeFalse();
  });

  it('should handle null listAll periods', () => {
    periodMock.listAll = () => of(null);
    periodMock.getActivePeriod = () => '2024-1';
    periodMock.activePeriod$ = of('2024-1');

    createComponent();
    flushInit();
    expect(component.periodOptionsPrint).toEqual([]);
  });

  it('printPdf should return early when window.open returns null', () => {
    createComponent();
    flushInit();
    spyOn(window, 'open').and.returnValue(null as any);
    component.printPdf();
    expect(window.open).toHaveBeenCalled();
  });

  it('printPdf should write and close document when window.open works', () => {
    createComponent();
    flushInit();
    const w: any = { document: { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') } };
    spyOn(window, 'open').and.returnValue(w);
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.printPdf();
    expect(w.document.write).toHaveBeenCalled();
    expect(w.document.close).toHaveBeenCalled();
  });

  it('printPdf should include fallback rows when there is no distribucion/top data', () => {
    createComponent();
    flushInit();

    component.distribucionCarreras = [];
    component.topTutores = [];
    component.selectedPeriodPrint = undefined;
    periodMock.getActivePeriod = () => '';

    const w: any = { document: { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') } };
    spyOn(window, 'open').and.returnValue(w);
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.printPdf();

    const html = (w.document.write as any).calls.mostRecent().args[0] as string;
    expect(html).toContain('Sin datos');
  });

  it('printPdf should use periodSvc.getActivePeriod when selectedPeriodPrint is undefined', () => {
    createComponent();
    flushInit();

    component.selectedPeriodPrint = undefined;
    periodMock.getActivePeriod = () => '2024-1';

    const w: any = { document: { write: jasmine.createSpy('write'), close: jasmine.createSpy('close') } };
    spyOn(window, 'open').and.returnValue(w);
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.printPdf();

    const html = (w.document.write as any).calls.mostRecent().args[0] as string;
    expect(html).toContain('2024-1');
  });
});
