import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CronogramaUic } from './cronograma-uic';
import { CronogramaUicService } from '../../../services/cronograma-uic.service';
import { CronogramaExportService } from '../../../services/cronograma-export.service';
import { PeriodService } from '../../../services/period.service';

describe('CronogramaUic', () => {
  let component: CronogramaUic;
  let fixture: ComponentFixture<CronogramaUic>;
  let svcMock: any;
  let exportMock: any;
  let periodMock: any;

  beforeEach(async () => {
    svcMock = {
      getDraft: jasmine.createSpy('getDraft').and.returnValue({ titulo: '', filas: [], proyecto: '', periodo: undefined }),
      setDraft: jasmine.createSpy('setDraft'),
      createDraft: jasmine.createSpy('createDraft').and.returnValue(of(null)),
      getUltimoPublicado: jasmine.createSpy('getUltimoPublicado').and.returnValue(null),
      publish: jasmine.createSpy('publish').and.returnValue(of({})),
      saveAsPublished: jasmine.createSpy('saveAsPublished'),
      addRow: jasmine.createSpy('addRow'),
      removeRow: jasmine.createSpy('removeRow'),
    };
    exportMock = { exportCSV: jasmine.createSpy('exportCSV'), exportPDF: jasmine.createSpy('exportPDF') };
    periodMock = {
      listAll: jasmine.createSpy('listAll').and.returnValue(of([{ id_academic_periods: 1, name: 'P1' } as any])),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue('P1'),
    };

    await TestBed.configureTestingModule({
      imports: [CronogramaUic],
      providers: [
        {
          provide: CronogramaUicService,
          useValue: svcMock,
        },
        {
          provide: CronogramaExportService,
          useValue: exportMock,
        },
        {
          provide: PeriodService,
          useValue: periodMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onPeriodoChange should reset when invalid', () => {
    component.onPeriodoChange(undefined);
    expect(component.selectedPeriodId).toBeUndefined();
    expect(component.model.periodo).toBeUndefined();
  });

  it('onPeriodoChange should use backend data when createDraft returns data', () => {
    svcMock.createDraft.and.returnValue(of({ titulo: 'T', filas: [], proyecto: 'X', periodo: undefined }));
    component.periodOptions = [{ id_academic_periods: 1, name: 'P1' }];
    component.onPeriodoChange(1);
    expect(component.selectedPeriodId).toBe(1);
    expect(component.model.periodo).toBe('P1');
    expect(svcMock.setDraft).toHaveBeenCalled();
  });

  it('onPeriodoChange should clone ultimoPublicado when createDraft returns null', () => {
    svcMock.getUltimoPublicado.and.returnValue({ titulo: 'T', filas: [{ actividad: 'A', responsable: 'R', fechaInicio: '2024-01-01' }], proyecto: 'X', periodo: 'OLD' });
    svcMock.createDraft.and.returnValue(of(null));
    component.periodOptions = [{ id_academic_periods: 1, name: 'P1' }];
    component.onPeriodoChange(1);
    expect(component.model.periodo).toBe('P1');
    expect(component.model.titulo).toBe('T');
  });

  it('onPeriodoChange should fallback to getDraft when no published exists', () => {
    svcMock.getUltimoPublicado.and.returnValue(null);
    svcMock.getDraft.and.returnValue({ titulo: 'N', filas: [], proyecto: 'X', periodo: undefined });
    svcMock.createDraft.and.returnValue(of(null));
    component.periodOptions = [{ id_academic_periods: 1, name: 'P1' }];
    component.onPeriodoChange(1);
    expect(component.model.periodo).toBe('P1');
    expect(component.model.titulo).toBe('N');
  });

  it('onPeriodoChange should fallback on error', () => {
    svcMock.getUltimoPublicado.and.returnValue(null);
    svcMock.getDraft.and.returnValue({ titulo: 'N', filas: [], proyecto: 'X', periodo: undefined });
    svcMock.createDraft.and.returnValue({ subscribe: ({ error, complete }: any) => { error(new Error('x')); complete?.(); } });
    component.periodOptions = [{ id_academic_periods: 1, name: 'P1' }];
    component.onPeriodoChange(1);
    expect(component.model.periodo).toBe('P1');
  });

  it('addRow/removeRow should be blocked when not active period selected', () => {
    component.selectedPeriodId = 1;
    component.model.periodo = 'P2';
    periodMock.getActivePeriod.and.returnValue('P1');
    component.addRow();
    component.removeRow(0);
    expect(svcMock.addRow).not.toHaveBeenCalled();
    expect(svcMock.removeRow).not.toHaveBeenCalled();
  });

  it('addRow/removeRow should call service when active period selected', () => {
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    periodMock.getActivePeriod.and.returnValue('P1');
    component.addRow();
    component.removeRow(0);
    expect(svcMock.addRow).toHaveBeenCalled();
    expect(svcMock.removeRow).toHaveBeenCalled();
  });

  it('publish should alert when no selected period', () => {
    spyOn(window, 'alert');
    component.selectedPeriodId = undefined;
    component.publish();
    expect(window.alert).toHaveBeenCalled();
  });

  it('publish should stop when validate fails', () => {
    spyOn(component, 'validate').and.returnValue(false);
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    component.publish();
    expect(svcMock.publish).not.toHaveBeenCalled();
  });

  it('publish should alert when model.periodo missing', () => {
    spyOn(window, 'alert');
    spyOn(component, 'validate').and.returnValue(true);
    component.selectedPeriodId = 1;
    component.model.periodo = undefined;
    component.model.titulo = 'T';
    component.model.proyecto = 'X';
    component.model.filas = [{ actividad: 'A', responsable: 'R', fechaInicio: '2024-01-01' } as any];
    component.publish();
    expect(window.alert).toHaveBeenCalled();
  });

  it('publish should alert when active period mismatch', () => {
    spyOn(window, 'alert');
    periodMock.getActivePeriod.and.returnValue('P2');
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    component.model.titulo = 'T';
    component.model.proyecto = 'X';
    component.model.filas = [{ actividad: 'A', responsable: 'R', fechaInicio: '2024-01-01' } as any];
    component.publish();
    expect(window.alert).toHaveBeenCalled();
  });

  it('publish should save as published on success', () => {
    spyOn(window, 'alert');
    periodMock.getActivePeriod.and.returnValue('P1');
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    component.model.titulo = 'T';
    component.model.proyecto = 'X';
    component.model.filas = [{ actividad: 'A', responsable: 'R', fechaInicio: '2024-01-01' } as any];
    component.publish();
    expect(svcMock.publish).toHaveBeenCalled();
    expect(svcMock.saveAsPublished).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });

  it('publish should alert on publish error', () => {
    spyOn(window, 'alert');
    svcMock.publish.and.returnValue({ subscribe: ({ error }: any) => error({ error: { message: 'E' } }) });
    periodMock.getActivePeriod.and.returnValue('P1');
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    component.model.titulo = 'T';
    component.model.proyecto = 'X';
    component.model.filas = [{ actividad: 'A', responsable: 'R', fechaInicio: '2024-01-01' } as any];
    component.publish();
    expect(window.alert).toHaveBeenCalled();
  });

  it('resetRowDates should clear dates and call onChange', () => {
    spyOn(component, 'onChange');
    component.model.filas = [{ fechaInicio: '2024-01-01', fechaFin: '2024-02-01' } as any];
    component.resetRowDates(0);
    expect(component.model.filas[0].fechaInicio).toBeUndefined();
    expect(component.model.filas[0].fechaFin).toBeUndefined();
    expect(component.onChange).toHaveBeenCalled();
  });

  it('minForFin should return max between globalMinDate and row fechaInicio', () => {
    component.model.filas = [{ fechaInicio: '2024-01-01', fechaFin: undefined } as any];
    (component as any).globalMinDate = '2024-03-01';
    expect(component.minForFin({ fechaInicio: '2024-02-01' })).toBe('2024-03-01');
  });

  it('autoResize should adjust textarea height', () => {
    const ta = document.createElement('textarea');
    Object.defineProperty(ta, 'scrollHeight', { value: 120 });
    component.autoResize({ target: ta } as any);
    expect(ta.style.height).toBe('120px');
  });

  it('onChange should be blocked when not active period selected', () => {
    component.selectedPeriodId = 1;
    component.model.periodo = 'P2';
    periodMock.getActivePeriod.and.returnValue('P1');
    component.onChange();
    expect(svcMock.setDraft).not.toHaveBeenCalled();
  });

  it('onChange should setDraft and validate when active period selected', () => {
    spyOn(component, 'validate').and.callThrough();
    component.selectedPeriodId = 1;
    component.model.periodo = 'P1';
    periodMock.getActivePeriod.and.returnValue('P1');
    component.onChange();
    expect(svcMock.setDraft).toHaveBeenCalled();
    expect(component.validate).toHaveBeenCalled();
  });

  it('exportCSV/exportPDF should delegate to export service', () => {
    component.exportCSV();
    expect(exportMock.exportCSV).toHaveBeenCalled();
    component.exportPDF();
    expect(exportMock.exportPDF).toHaveBeenCalled();
  });

  it('loadDraft should createDraft using found period id and use backend data when provided', () => {
    periodMock.listAll.and.returnValue(of([{ id_academic_periods: 7, name: 'P7' } as any]));
    svcMock.createDraft.and.returnValue(of({ titulo: 'T', filas: [], proyecto: 'X', periodo: 'IGN' }));
    component.model.periodo = 'P7';
    component.loadDraft();
    expect(svcMock.createDraft).toHaveBeenCalledWith(7);
    expect(component.model.periodo).toBe('P7');
  });

  it('loadDraft should fallback to local when createDraft returns null and published exists', () => {
    periodMock.listAll.and.returnValue(of([{ id_academic_periods: 7, name: 'P7' } as any]));
    svcMock.createDraft.and.returnValue(of(null));
    svcMock.getUltimoPublicado.and.returnValue({ titulo: 'OLD', filas: [], proyecto: 'X', periodo: 'OLDP' });
    component.model.periodo = 'P7';
    component.loadDraft();
    expect(component.model.titulo).toBe('OLD');
    expect(component.model.periodo).toBe('P7');
  });

  it('loadDraft should fallback to local when period id not found', () => {
    periodMock.listAll.and.returnValue(of([{ id_academic_periods: 1, name: 'P1' } as any]));
    svcMock.getUltimoPublicado.and.returnValue(null);
    svcMock.getDraft.and.returnValue({ titulo: 'N', filas: [], proyecto: 'X', periodo: undefined });
    component.model.periodo = 'P7';
    component.loadDraft();
    expect(component.model.titulo).toBe('N');
    expect(component.model.periodo).toBe('P7');
  });

  it('loadDraft should set periodo undefined when no selected period name', () => {
    svcMock.getUltimoPublicado.and.returnValue(null);
    svcMock.getDraft.and.returnValue({ titulo: 'N', filas: [], proyecto: 'X', periodo: 'X' });
    component.model.periodo = undefined;
    component.loadDraft();
    expect(component.model.periodo).toBeUndefined();
  });
});
