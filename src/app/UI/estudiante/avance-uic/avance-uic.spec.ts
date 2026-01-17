import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { EMPTY, Subject, of, throwError } from 'rxjs';

import { AvanceUic } from './avance-uic';
import { StudentCronogramaService } from '../../../services/student-cronograma.service';

describe('AvanceUic', () => {
  let component: AvanceUic;
  let fixture: ComponentFixture<AvanceUic>;
  let svcMock: any;

  beforeEach(async () => {
    svcMock = {
      getAvanceUIC: () => of({ tutorNombre: null, p1: 0, p2: 0, p3: 0 }),
      uploadUicFinal: () => of({}),
      sendInformeFinal: () => of({}),
    };
    await TestBed.configureTestingModule({
      imports: [AvanceUic],
      providers: [
        {
          provide: StudentCronogramaService,
          useValue: svcMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvanceUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('constructor should map avance values and stop loading', () => {
    svcMock.getAvanceUIC = () => of({ tutorNombre: 'Tutor', p1: 1, p2: 2, p3: 3 });
    fixture = TestBed.createComponent(AvanceUic);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.tutorNombre).toBe('Tutor');
    expect(component.notas).toEqual({ p1: 1, p2: 2, p3: 3 });
    expect(component.loading).toBeFalse();
  });

  it('constructor should tolerate null response and keep defaults', () => {
    svcMock.getAvanceUIC = () => of(null as any);
    fixture = TestBed.createComponent(AvanceUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.tutorNombre).toBeNull();
    expect(component.notas).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(component.loading).toBeFalse();
  });

  it('constructor should tolerate empty object response and keep nullish defaults', () => {
    svcMock.getAvanceUIC = () => of({ tutorNombre: undefined, p1: undefined, p2: undefined, p3: undefined } as any);
    fixture = TestBed.createComponent(AvanceUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.tutorNombre).toBeNull();
    expect(component.notas).toEqual({ p1: 0, p2: 0, p3: 0 });
    expect(component.loading).toBeFalse();
  });

  it('promedio should average numeric values and handle non-numbers', () => {
    expect(component.promedio).toBe(0);
    component.notas = { p1: 1, p2: 2, p3: 3 };
    expect(component.promedio).toBe(2);
    component.notas = { p1: 1 as any, p2: null as any, p3: 0 as any };
    expect(component.promedio).toBe(0.5);
  });

  it('promedio should return 0 when no numeric values exist', () => {
    component.notas = { p1: 'x' as any, p2: undefined as any, p3: null as any };
    expect(component.promedio).toBe(0);
  });

  it('puedeSubirInforme/canEnviarInforme should reflect p2 and file presence', () => {
    component.notas.p2 = 0;
    component.informeArchivo = null;
    expect(component.puedeSubirInforme).toBeFalse();
    expect(component.canEnviarInforme).toBeFalse();
    component.notas.p2 = 5;
    expect(component.puedeSubirInforme).toBeTrue();
    expect(component.canEnviarInforme).toBeFalse();
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });
    expect(component.canEnviarInforme).toBeTrue();
  });

  it('puedeSubirInforme should treat null/undefined p2 as 0', () => {
    component.notas.p2 = null as any;
    expect(component.puedeSubirInforme).toBeFalse();
    component.notas.p2 = undefined as any;
    expect(component.puedeSubirInforme).toBeFalse();
  });

  it('onInformeChange should set file and name, and clear when none', () => {
    const f = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });
    component.onInformeChange({ target: { files: [f] } } as any);
    expect(component.informeArchivo?.name).toBe('a.pdf');
    expect(component.informeNombre).toBe('a.pdf');
    component.onInformeChange({ target: { files: [] } } as any);
    expect(component.informeArchivo).toBeNull();
    expect(component.informeNombre).toBe('');
  });

  it('onInformeChange should clear when input has no files property', () => {
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });
    component.informeNombre = 'a.pdf';
    component.onInformeChange({ target: {} } as any);
    expect(component.informeArchivo).toBeNull();
    expect(component.informeNombre).toBe('');
  });

  it('enviarInforme should early return when cannot send or already sending', () => {
    component.notas.p2 = 0;
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });
    component.enviarInforme();
    expect(component.sending).toBeFalse();

    component.notas.p2 = 10;
    component.sending = true;
    component.enviarInforme();
    expect(component.sending).toBeTrue();
  });

  it('enviarInforme should upload+send and reset state on success', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    component.notas.p2 = 10;
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });
    component.informeNombre = 'a.pdf';

    const upload$ = new Subject<any>();
    const send$ = new Subject<any>();
    svcMock.uploadUicFinal = jasmine.createSpy('uploadUicFinal').and.returnValue(upload$.asObservable());
    svcMock.sendInformeFinal = jasmine.createSpy('sendInformeFinal').and.returnValue(send$.asObservable());

    component.enviarInforme();
    expect(component.sending).toBeTrue();

    upload$.next({});
    upload$.complete();
    send$.next({});
    send$.complete();
    flushMicrotasks();

    expect(component.toastMsg).toContain('Informe final enviado');
    expect(component.showToast).toBeFalse();
    expect(component.informeArchivo).toBeNull();
    expect(component.informeNombre).toBe('');
    expect(component.sending).toBeFalse();
  }));

  it('enviarInforme should set error toast on failure', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.notas.p2 = 10;
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });

    svcMock.uploadUicFinal = jasmine.createSpy('uploadUicFinal').and.returnValue(throwError(() => new Error('X')));
    svcMock.sendInformeFinal = jasmine.createSpy('sendInformeFinal').and.returnValue(of({}));

    component.enviarInforme();
    flushMicrotasks();
    expect(component.toastMsg).toContain('No se pudo enviar');
    expect(component.sending).toBeFalse();
  }));

  it('enviarInforme should handle sendInformeFinal error after upload succeeds', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.notas.p2 = 10;
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });

    svcMock.uploadUicFinal = jasmine.createSpy('uploadUicFinal').and.returnValue(of({}));
    svcMock.sendInformeFinal = jasmine.createSpy('sendInformeFinal').and.returnValue(throwError(() => new Error('X')));

    component.enviarInforme();
    flushMicrotasks();
    expect(component.toastMsg).toContain('No se pudo enviar');
    expect(component.sending).toBeFalse();
    expect(component.informeArchivo).not.toBeNull();
  }));

  it('enviarInforme should complete without calling sendInformeFinal when upload emits nothing', fakeAsync(() => {
    component.notas.p2 = 10;
    component.informeArchivo = new File([new Blob(['x'])], 'a.pdf', { type: 'application/pdf' });

    svcMock.uploadUicFinal = jasmine.createSpy('uploadUicFinal').and.returnValue(EMPTY);
    svcMock.sendInformeFinal = jasmine.createSpy('sendInformeFinal').and.returnValue(of({}));

    component.enviarInforme();
    flushMicrotasks();
    expect(svcMock.sendInformeFinal).not.toHaveBeenCalled();
    expect(component.sending).toBeFalse();
  }));
});
