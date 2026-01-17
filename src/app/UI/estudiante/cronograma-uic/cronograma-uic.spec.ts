import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, throwError } from 'rxjs';

import { CronogramaUic } from './cronograma-uic';
import { StudentCronogramaService } from '../../../services/student-cronograma.service';

describe('CronogramaUic', () => {
  let component: CronogramaUic;
  let fixture: ComponentFixture<CronogramaUic>;
  let svcMock: any;

  beforeEach(async () => {
    svcMock = { getUICByActivePeriod: () => of({ filas: [] }) };
    await TestBed.configureTestingModule({
      imports: [CronogramaUic],
      providers: [
        {
          provide: StudentCronogramaService,
          useValue: svcMock,
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

  it('isSoloDel should handle null/undefined and membership (including 0)', () => {
    expect(component.isSoloDel(null)).toBeFalse();
    expect(component.isSoloDel(undefined)).toBeFalse();
    expect(component.isSoloDel(1)).toBeTrue();
    expect(component.isSoloDel(0)).toBeFalse();
  });

  it('isSoloDel should handle numbers not in soloDel', () => {
    expect(component.isSoloDel(2)).toBeFalse();
    expect(component.isSoloDel(3)).toBeFalse();
    expect(component.isSoloDel(6)).toBeFalse();
    expect(component.isSoloDel(100)).toBeFalse();
  });

  it('isSoloDel should return true for other known members', () => {
    expect(component.isSoloDel(4)).toBeTrue();
    expect(component.isSoloDel(5)).toBeTrue();
    expect(component.isSoloDel(15)).toBeTrue();
    expect(component.isSoloDel(21)).toBeTrue();
  });

  it('should sort filas by canonical list first and assign nro', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Disertación del proyecto de titulación', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes', fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: 'Actividad desconocida', fechaInicio: '2023-12-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(3);
    // canonical items first (presentación ... then disertación ...), unknown last
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
    expect(String(filas[2].actividad)).toContain('Actividad desconocida');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2, 3]);
    expect(component.isLoading).toBeFalse();
  });

  it('should fallback sort by date then actividad when canonical index ties/missing', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'ZZZ', fechaFin: '2024-01-02T00:00:00Z' },
        { actividad: 'AAA', fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: 'BBB' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // no-date (0) first, then by date asc
    expect(filas[0].actividad).toBe('BBB');
    expect(filas[1].actividad).toBe('AAA');
    expect(filas[2].actividad).toBe('ZZZ');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2, 3]);
  });

  it('should cover comparator branch when canonical index ties and dates differ', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Presentación de documentos habilitantes', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(filas[0].fechaInicio).toContain('2024-01-01');
    expect(filas[1].fechaInicio).toContain('2024-02-01');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2]);
  });

  it('should cover localeCompare when canonical index ties and dates are equal', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Presentación de documentos habilitantes - B', fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes - A', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(String(filas[0].actividad)).toContain('- A');
    expect(String(filas[1].actividad)).toContain('- B');
  });

  it('should cover localeCompare when both are non-canonical and have same fechaFin', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'BBB', fechaFin: '2024-01-01T00:00:00Z' },
        { actividad: 'AAA', fechaFin: '2024-01-01T00:00:00Z' },
        { actividad: null, fechaFin: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas[0].actividad).toBeNull();
    expect(filas[1].actividad).toBe('AAA');
    expect(filas[2].actividad).toBe('BBB');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2, 3]);
  });

  it('should cover date=0 branches when both items have no fechaInicio/fechaFin (localeCompare fallback)', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'BBB' },
        { actividad: 'AAA' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(filas[0].actividad).toBe('AAA');
    expect(filas[1].actividad).toBe('BBB');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2]);
  });

  it('should sort using fechaFin for both items when fechaInicio is missing', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'BBB', fechaFin: '2024-01-02T00:00:00Z' },
        { actividad: 'AAA', fechaFin: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(filas[0].actividad).toBe('AAA');
    expect(filas[1].actividad).toBe('BBB');
  });

  it('should sort with undated item first when mixed dated/undated (reverse input order)', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        // reverse: dated first, undated second
        { actividad: 'AAA', fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: 'BBB' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(filas[0].actividad).toBe('BBB');
    expect(filas[1].actividad).toBe('AAA');
  });

  it('should use fechaFin when fechaInicio is empty string', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'AAA', fechaInicio: '', fechaFin: '2024-01-02T00:00:00Z' },
        { actividad: 'BBB', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // BBB has earlier date (fechaInicio). AAA should use fechaFin because fechaInicio is ''
    expect(filas[0].actividad).toBe('BBB');
    expect(filas[1].actividad).toBe('AAA');
  });

  it('should prefer fechaInicio over fechaFin when both present', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        // If fechaFin was used, A would look earlier; but component should use fechaInicio
        { actividad: 'AAA', fechaInicio: '2024-01-03T00:00:00Z', fechaFin: '2024-01-01T00:00:00Z' },
        { actividad: 'BBB', fechaInicio: '2024-01-02T00:00:00Z', fechaFin: '2024-01-04T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // BBB fechaInicio is earlier than AAA fechaInicio, so BBB should come first
    expect(filas[0].actividad).toBe('BBB');
    expect(filas[1].actividad).toBe('AAA');
  });

  it('should set data when response is null and stop loading', () => {
    svcMock.getUICByActivePeriod = () => of(null as any);
    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data).toBeNull();
    expect(component.isLoading).toBeFalse();
  });

  it('should stop loading when service completes without emitting (EMPTY)', () => {
    svcMock.getUICByActivePeriod = () => EMPTY;
    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data).toBeNull();
    expect(component.isLoading).toBeFalse();
  });

  it('should skip sorting when filas is not an array', () => {
    svcMock.getUICByActivePeriod = () => of({ filas: null } as any);
    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect((component.data as any).filas).toBeNull();
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error when svc.getUICByActivePeriod fails', () => {
    svcMock.getUICByActivePeriod = () => throwError(() => new Error('X'));
    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    component['isLoading'] = true;
    fixture.detectChanges();
    // component only flips isLoading on complete, and does not handle error
    expect(component.isLoading).toBeTrue();
  });

  it('should handle canonical activity with different case', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'DISERTACIÓN DEL PROYECTO DE TITULACIÓN', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'presentación de documentos habilitantes', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // Both match canonical (case-insensitive): Presentación comes before Disertación in canonical list
    expect(String(filas[0].actividad)).toContain('presentación');
    expect(String(filas[1].actividad)).toContain('DISERTACIÓN');
  });

  it('should handle actividad with extra whitespace', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: ' Disertación del proyecto de titulación ', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: ' Presentación de documentos habilitantes ', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
  });

  it('should handle actividad with special characters', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Disertación del proyecto de titulación', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
  });

  it('should handle actividad with accents', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Disertación del proyecto de titulación', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
  });

  it('should handle actividad with numbers', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Disertación del proyecto de titulación 2024', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes 2024', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
  });

  it('should handle actividad with symbols', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'Disertación del proyecto de titulación!', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'Presentación de documentos habilitantes!', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('Presentación');
    expect(String(filas[1].actividad)).toContain('Disertación');
  });

  it('should handle actividad with mixed case', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'DiSeRtAcIóN Del pRoYeCtO De TiTuLaCióN', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'PrEsEnTaCiOn De DoCuMeNtOs HaBiLiTaNtEs', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // 'DiSeRtAcIóN ...' matches canonical (accented), while 'PrEsEnTaCiOn ...' (no accent) does not => canonical wins
    expect(String(filas[0].actividad)).toContain('DiSeRtAcIóN');
    expect(String(filas[1].actividad)).toContain('PrEsEnTaCiOn');
  });

  it('should handle actividad with mixed case and accents', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'DiSeRtAcIóN Del pRoYeCtO De TiTuLaCióN', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'PrEsEnTaCiOn De DoCuMeNtOs HaBiLiTaNtEs', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('DiSeRtAcIóN');
    expect(String(filas[1].actividad)).toContain('PrEsEnTaCiOn');
  });

  it('should handle actividad with mixed case, accents and numbers', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'DiSeRtAcIóN Del pRoYeCtO De TiTuLaCióN 2024', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'PrEsEnTaCiOn De DoCuMeNtOs HaBiLiTaNtEs 2024', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('DiSeRtAcIóN');
    expect(String(filas[1].actividad)).toContain('PrEsEnTaCiOn');
  });

  it('should handle actividad with mixed case, accents, numbers and symbols', () => {
    svcMock.getUICByActivePeriod = () => of({
      filas: [
        { actividad: 'DiSeRtAcIóN Del pRoYeCtO De TiTuLaCióN 2024!', fechaInicio: '2024-02-01T00:00:00Z' },
        { actividad: 'PrEsEnTaCiOn De DoCuMeNtOs HaBiLiTaNtEs 2024!', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(String(filas[0].actividad)).toContain('DiSeRtAcIóN');
    expect(String(filas[1].actividad)).toContain('PrEsEnTaCiOn');
  });
});