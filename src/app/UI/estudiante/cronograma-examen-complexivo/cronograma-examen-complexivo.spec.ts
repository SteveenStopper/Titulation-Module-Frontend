import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CronogramaExamenComplexivo } from './cronograma-examen-complexivo';
import { StudentCronogramaService } from '../../../services/student-cronograma.service';

describe('CronogramaExamenComplexivo', () => {
  let component: CronogramaExamenComplexivo;
  let fixture: ComponentFixture<CronogramaExamenComplexivo>;
  let svcMock: any;

  beforeEach(async () => {
    svcMock = { getComplexivoByActivePeriod: () => of({ filas: [] }) };
    await TestBed.configureTestingModule({
      imports: [CronogramaExamenComplexivo],
      providers: [
        {
          provide: StudentCronogramaService,
          useValue: svcMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
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

  it('isSoloDel should return true for other known members', () => {
    expect(component.isSoloDel(4)).toBeTrue();
    expect(component.isSoloDel(14)).toBeTrue();
    expect(component.isSoloDel(15)).toBeTrue();
    expect(component.isSoloDel(16)).toBeTrue();
    expect(component.isSoloDel(17)).toBeTrue();
  });

  it('should sort filas by date then actividad and assign nro', () => {
    svcMock.getComplexivoByActivePeriod = () => of({
      filas: [
        { actividad: 'BBB', fechaInicio: '2024-01-02T00:00:00Z' },
        { actividad: 'AAA', fechaFin: '2024-01-01T00:00:00Z' },
        { actividad: 'CCC' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // no-date (0) first, then by date asc
    expect(filas[0].actividad).toBe('CCC');
    expect(filas[1].actividad).toBe('AAA');
    expect(filas[2].actividad).toBe('BBB');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2, 3]);
    expect(component.isLoading).toBeFalse();
  });

  it('should cover db date=0 branch (b has no dates) and localeCompare with empty actividad fallback', () => {
    svcMock.getComplexivoByActivePeriod = () => of({
      filas: [
        // a is dated, b undated => comparator uses db : 0 branch
        { actividad: 'AAA', fechaInicio: '2024-01-02T00:00:00Z' },
        { actividad: 'BBB' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    // undated first (0)
    expect(filas[0].actividad).toBe('BBB');
    expect(filas[1].actividad).toBe('AAA');
  });

  it('should cover localeCompare fallback when same date and actividad is null/undefined', () => {
    svcMock.getComplexivoByActivePeriod = () => of({
      filas: [
        // same date -> localeCompare; null/undefined actividad fall back to ''
        { actividad: null, fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: undefined, fechaInicio: '2024-01-01T00:00:00Z' },
        { actividad: 'AAA', fechaInicio: '2024-01-01T00:00:00Z' },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(3);
    // '' comes before 'AAA'
    expect(filas[0].actividad).toBeNull();
    expect(filas[2].actividad).toBe('AAA');
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2, 3]);
  });

  it('should cover localeCompare when both actividad fall back to empty string', () => {
    svcMock.getComplexivoByActivePeriod = () => of({
      filas: [
        // both undated => da=db=0, localeCompare executes; both sides use '' fallback
        { actividad: undefined },
        { actividad: undefined },
      ]
    } as any);

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const filas = (component.data as any).filas;
    expect(filas.length).toBe(2);
    expect(filas.map((f: any) => f.nro)).toEqual([1, 2]);
  });

  it('should swap positions 11 and 12 when there are at least 12 rows', () => {
    const filas = Array.from({ length: 12 }).map((_, i) => ({
      actividad: 'A' + String(i + 1).padStart(2, '0'),
      fechaInicio: '2024-01-01T00:00:00Z'
    }));
    // Make sure original order is stable after sort by actividad
    svcMock.getComplexivoByActivePeriod = () => of({ filas } as any);

    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const out = (component.data as any).filas;
    expect(out.length).toBe(12);
    // after swap, nro=11 should have originally A12 and nro=12 should have A11
    expect(out[10].actividad).toBe('A12');
    expect(out[11].actividad).toBe('A11');
    expect(out[10].nro).toBe(11);
    expect(out[11].nro).toBe(12);
  });

  it('should not swap when there are fewer than 12 rows', () => {
    const filas = Array.from({ length: 11 }).map((_, i) => ({
      actividad: 'A' + String(i + 1).padStart(2, '0'),
      fechaInicio: '2024-01-01T00:00:00Z'
    }));
    svcMock.getComplexivoByActivePeriod = () => of({ filas } as any);
    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const out = (component.data as any).filas;
    expect(out.length).toBe(11);
    expect(out[9].actividad).toBe('A10');
    expect(out[10].actividad).toBe('A11');
  });

  it('should set data when response is null and stop loading', () => {
    svcMock.getComplexivoByActivePeriod = () => of(null as any);
    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.data).toBeNull();
    expect(component.isLoading).toBeFalse();
  });

  it('should skip sorting when filas is not an array', () => {
    svcMock.getComplexivoByActivePeriod = () => of({ filas: null } as any);
    fixture = TestBed.createComponent(CronogramaExamenComplexivo);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect((component.data as any).filas).toBeNull();
    expect(component.isLoading).toBeFalse();
  });
});
