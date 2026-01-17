import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';

import { GestionModalidad } from './gestion-modalidad';
import { EnrollmentsService } from '../../../services/enrollments.service';
import { StudentApiService } from '../../../services/student-api.service';
import { MeService } from '../../../services/me.service';
import { ModalityService } from '../../../services/modality.service';

describe('GestionModalidad', () => {
  let component: GestionModalidad;
  let fixture: ComponentFixture<GestionModalidad>;

  let httpClientMock: any;

  let routeMock: any;
  let enrollMock: any;
  let studentApiMock: any;
  let meMock: any;
  let modalitySvcMock: any;

  let activePeriodId$: BehaviorSubject<any>;
  let current$: Subject<any>;
  let select$: Subject<any>;

  beforeEach(async () => {
    activePeriodId$ = new BehaviorSubject<any>(null);
    current$ = new Subject<any>();
    select$ = new Subject<any>();

    routeMock = {
      snapshot: {
        queryParamMap: { get: (_k: string) => null },
      },
    };

    enrollMock = {
      current: jasmine.createSpy('current').and.returnValue(current$.asObservable()),
      select: jasmine.createSpy('select').and.returnValue(select$.asObservable()),
    };

    studentApiMock = {
      getActivePeriodId$: jasmine.createSpy('getActivePeriodId$').and.returnValue(activePeriodId$.asObservable()),
    };

    meMock = {
      getProfile: jasmine
        .createSpy('getProfile')
        .and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'approved' } } })),
    };

    modalitySvcMock = {
      set: jasmine.createSpy('set'),
    };

    httpClientMock = {
      get: jasmine.createSpy('get').and.callFake((url: string) => {
        if (url === '/api/uic/docentes') return of([]);
        if (url === '/api/uic/carreras') return of([]);
        if (url === '/api/uic/topic') return of(null);
        return of(null);
      }),
      post: jasmine.createSpy('post').and.returnValue(of({ id: 99 })),
    };

    TestBed.configureTestingModule({
      imports: [GestionModalidad],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: routeMock,
        },
        {
          provide: EnrollmentsService,
          useValue: enrollMock,
        },
        {
          provide: StudentApiService,
          useValue: studentApiMock,
        },
        {
          provide: MeService,
          useValue: meMock,
        },
        {
          provide: ModalityService,
          useValue: modalitySvcMock,
        },
      ],
    });

    TestBed.overrideProvider(HttpClient, { useValue: httpClientMock });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    activePeriodId$.next(null);
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');
    current$.next({});
    current$.complete();
    expect(component).toBeTruthy();
  });

  it('selectedModality should return null when current/modality missing', () => {
    fixture.detectChanges();
    component.current = null;
    expect(component.selectedModality).toBeNull();
    component.current = {} as any;
    expect(component.selectedModality).toBeNull();
  });

  it('ngOnInit should bypass validations when query param enabled', () => {
    routeMock.snapshot.queryParamMap.get = () => 'true';
    fixture.detectChanges();

    expect(component.bypassValidations).toBeTrue();
    expect(component.canChooseModality).toBeTrue();
    expect(component.validationsMsg).toBe('');
    expect(component.validationsLoading).toBeFalse();
  });

  it('ngOnInit should bypass validations when query param is 1/yes', () => {
    routeMock.snapshot.queryParamMap.get = () => '1';
    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.bypassValidations).toBeTrue();

    routeMock.snapshot.queryParamMap.get = () => 'yes';
    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.bypassValidations).toBeTrue();
  });

  it('ngOnInit should clear validationsMsg when approved', () => {
    meMock.getProfile.and.returnValue(
      of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'approved' } } }),
    );
    fixture.detectChanges();
    expect(component.canChooseModality).toBeTrue();
    expect(component.validationsMsg).toBe('');
  });

  it('ngOnInit should set validationsMsg when not approved and handle error', () => {
    meMock.getProfile.and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'pending' } } }));
    fixture.detectChanges();
    expect(component.canChooseModality).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');

    const subj = new Subject<any>();
    meMock.getProfile.and.returnValue(subj.asObservable());
    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    subj.error(new Error('X'));
    expect(component.canChooseModality).toBeFalse();
    expect(component.validationsMsg).toContain('No se pudo verificar');
  });

  it('ngOnInit should default validation states to empty when missing', () => {
    meMock.getProfile.and.returnValue(of({ validations: {} }));
    fixture.detectChanges();
    expect(component.canChooseModality).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');
  });

  it('ngOnInit should default missing tes/sec estados separately', () => {
    meMock.getProfile.and.returnValue(of({ validations: { tesoreria_aranceles: {} } }));
    fixture.detectChanges();
    expect(component.canChooseModality).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');

    meMock.getProfile.and.returnValue(of({ validations: { secretaria_promedios: {} } }));
    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.canChooseModality).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');
  });

  it('ngOnInit should load current enrollment and sync modality/tab flags', () => {
    fixture.detectChanges();

    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');

    activePeriodId$.next(10);
    expect(enrollMock.current).toHaveBeenCalledWith(10);
    current$.next({ modality: 'UIC' });
    current$.complete();
    expect(component.uicSubmitted).toBeTrue();
    expect(component.complexivoSelected).toBeFalse();
    expect(component.activeTab).toBe('uic');
    expect(modalitySvcMock.set).toHaveBeenCalledWith('UIC');
  });

  it('ngOnInit should handle current enrollment null response', () => {
    fixture.detectChanges();
    activePeriodId$.next(10);
    current$.next(null);
    current$.complete();
    expect(component.current).toBeNull();
    expect(component.uicSubmitted).toBeFalse();
    expect(component.complexivoSelected).toBeFalse();
  });

  it('ngOnInit should set flags when current modality is EXAMEN_COMPLEXIVO', () => {
    fixture.detectChanges();
    activePeriodId$.next(10);
    current$.next({ modality: 'EXAMEN_COMPLEXIVO' });
    current$.complete();
    expect(component.uicSubmitted).toBeFalse();
    expect(component.complexivoSelected).toBeTrue();
    expect(component.activeTab).toBe('complexivo');
    expect(modalitySvcMock.set).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');
  });

  it('ngOnInit should not sync sidebar when current modality is unknown', () => {
    fixture.detectChanges();
    activePeriodId$.next(10);
    current$.next({ modality: 'OTRA' });
    current$.complete();
    expect(component.uicSubmitted).toBeFalse();
    expect(component.complexivoSelected).toBeFalse();
    expect(modalitySvcMock.set).not.toHaveBeenCalledWith('UIC');
    expect(modalitySvcMock.set).not.toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');
  });

  it('should load docentes/carreras arrays and handle errors', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of({});
      if (url === '/api/uic/carreras') return throwError(() => new Error('X'));
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    fixture.detectChanges();
    activePeriodId$.next(null);
    expect(component.docentes).toEqual([]);
    expect(component.carreras).toEqual([]);
  });

  it('should set docentes to [] on docentes error and carreras non-array list', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return throwError(() => new Error('X'));
      if (url === '/api/uic/carreras') return of({});
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    fixture.detectChanges();
    expect(component.docentes).toEqual([]);
    expect(component.carreras).toEqual([]);
  });

  it('should handle null topic row and topic error path', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([]);
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    fixture.detectChanges();
    expect(component.uicTopicLoading).toBeFalse();

    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([]);
      if (url === '/api/uic/topic') return throwError(() => new Error('X'));
      return of(null);
    });
    fixture = TestBed.createComponent(GestionModalidad);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.uicTopicLoading).toBeFalse();
  });

  it('should filter carreras with invalid ids/names and map selectedCareerId from uic.carrera', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 'x', nombre: '' }, { id: 1, nombre: 'SISTEMAS' }]);
      if (url === '/api/uic/topic') return of({ id: 1, topic: 'T', career: 'SISTEMAS', id_tutor: 1 });
      return of(null);
    });
    fixture.detectChanges();

    expect(component.carreras.map(c => c.id)).toEqual([1]);
    expect(component.selectedCareerId).toBe(1);
  });

  it('carreras loader should not override selectedCareerId when already set (finite)', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 1, nombre: 'SISTEMAS' }, { id: 2, nombre: 'SOFT' }]);
      // topic null: this test targets only the carreras loader branch (selectedCareerId should not be recalculated)
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    // set values BEFORE ngOnInit runs
    component.selectedCareerId = 1;
    component.uic.carrera = 'SOFT';
    fixture.detectChanges();
    expect(component.selectedCareerId).toBe(1);
  });

  it('carreras loader should preselect career when selectedCareerId not finite and uic.carrera set', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 2, nombre: 'SOFT' }]);
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    component.selectedCareerId = NaN as any;
    component.uic.carrera = 'SOFT';
    fixture.detectChanges();
    expect(component.selectedCareerId).toBe(2);
  });

  it('carreras loader should set selectedCareerId null when uic.carrera has no match and selectedCareerId not finite', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 1, nombre: 'SISTEMAS' }]);
      if (url === '/api/uic/topic') return of(null);
      return of(null);
    });
    component.selectedCareerId = NaN as any;
    component.uic.carrera = 'OTRA';
    fixture.detectChanges();
    expect(component.selectedCareerId).toBeNull();
  });

  it('carreras loader should set selectedCareerId null when uic.carrera has no match', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 1, nombre: 'SISTEMAS' }]);
      if (url === '/api/uic/topic') return of({ id: 1, topic: 'T', career: 'OTRA', id_tutor: 1 });
      return of(null);
    });
    fixture.detectChanges();
    expect(component.uic.carrera).toBe('OTRA');
    expect(component.selectedCareerId).toBeNull();
  });

  it('chooseComplexivo should early return when isLoading true', () => {
    fixture.detectChanges();
    component.isLoading = true;
    component.current = null;
    component.chooseComplexivo();
    expect(enrollMock.select).not.toHaveBeenCalled();
  });

  it('chooseComplexivo should early return when canChooseModality is false', () => {
    fixture.detectChanges();
    component.isLoading = false;
    component.current = null;
    component.canChooseModality = false;
    component.chooseComplexivo();
    expect(enrollMock.select).not.toHaveBeenCalled();
  });

  it('should load existing uic topic and set selectedCareerId and tutor', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 1, nombre: 'SISTEMAS' }]);
      if (url === '/api/uic/topic') return of({ id: 7, topic: 'Tema', career: 'SISTEMAS', id_tutor: 9 });
      return of(null);
    });
    fixture.detectChanges();
    activePeriodId$.next(null);
    expect(component.uicTopicId).toBe(7);
    expect(component.uic.tema).toBe('Tema');
    expect(component.uic.carrera).toBe('SISTEMAS');
    expect(component.selectedTutorId).toBe(9);
    expect(component.selectedCareerId).toBe(1);
    expect(component.uicSubmitted).toBeTrue();
  });

  it('should use topic fallbacks when row fields are missing', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      if (url === '/api/uic/carreras') return of([{ id: 1, nombre: 'SISTEMAS' }]);
      if (url === '/api/uic/topic') return of({});
      return of(null);
    });
    fixture.detectChanges();
    expect(component.uicTopicId).toBeNull();
    expect(component.uic.tema).toBe('');
    expect(component.uic.carrera).toBe('');
  });

  it('topic loader should not preselect career when carreras not loaded and should handle invalid id_tutor', () => {
    httpClientMock.get.and.callFake((url: string) => {
      if (url === '/api/uic/docentes') return of([]);
      // carreras will be empty, so topic loader cannot map selectedCareerId here
      if (url === '/api/uic/carreras') return of([]);
      if (url === '/api/uic/topic') return of({ id: 7, topic: 'Tema', career: 'SISTEMAS', id_tutor: 'x' });
      return of(null);
    });
    fixture.detectChanges();
    expect(component.uic.carrera).toBe('SISTEMAS');
    expect(component.selectedCareerId).toBeNull();
    expect(component.selectedTutorId).toBeNull();
    expect(component.uicSubmitted).toBeTrue();
  });

  it('canSubmitUIC should validate fields', () => {
    fixture.detectChanges();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');

    component.uic.tema = '';
    component.selectedCareerId = null;
    component.selectedTutorId = null;
    expect(component.canSubmitUIC).toBeFalse();
    component.uic.tema = 'X';
    component.selectedCareerId = 1;
    component.selectedTutorId = 2;
    expect(component.canSubmitUIC).toBeTrue();
  });

  it('canSubmitUIC should reject whitespace topic and non-finite ids', () => {
    fixture.detectChanges();
    component.uic.tema = '   ';
    component.selectedCareerId = 1;
    component.selectedTutorId = 2;
    expect(component.canSubmitUIC).toBeFalse();

    component.uic.tema = 'Tema';
    component.selectedCareerId = NaN as any;
    component.selectedTutorId = 2;
    expect(component.canSubmitUIC).toBeFalse();
  });

  it('submitUIC should early return when invalid and show toast when gating blocks', fakeAsync(() => {
    fixture.detectChanges();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');

    component.uic.tema = '';
    component.selectedCareerId = null;
    component.selectedTutorId = null;
    component.submitUIC();
    expect(component.uicAttempted).toBeTrue();

    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 2;
    component.canChooseModality = false;
    component.validationsMsg = 'MSG';
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    component.submitUIC();
    expect(component.showToast).toBeFalse();
    expect(component.toastMsg).toBe('MSG');
  }));

  it('submitUIC should use fallback gating message when validationsMsg empty', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();

    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 2;
    component.canChooseModality = false;
    component.validationsMsg = '';
    component.submitUIC();
    expect(component.toastMsg).toBe('No puedes elegir modalidad aún.');
  }));

  it('submitUIC should post topic and then select modality, refresh current and sync sidebar', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    fixture.detectChanges();
    activePeriodId$.next(5);

    current$.next({});

    component.carreras = [{ id: 1, nombre: 'SISTEMAS' }];
    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 9;
    component.canChooseModality = true;

    component.submitUIC();
    expect(httpClientMock.post).toHaveBeenCalled();
    const call = httpClientMock.post.calls.allArgs().find((a: any[]) => a[0] === '/api/uic/topic');
    expect(call?.[1]?.career).toBe('SISTEMAS');

    expect(enrollMock.select).toHaveBeenCalledWith('UIC', 5);

    // ensure the refresh call inside select->next sees an emitted value
    enrollMock.current.and.returnValue(of({ modality: 'UIC' }));
    select$.next({});
    select$.complete();

    flushMicrotasks();
    expect(component.uicSubmitted).toBeTrue();
    expect(component.preselectUIC).toBeFalse();
    expect(modalitySvcMock.set).toHaveBeenCalledWith('UIC');
  }));

  it('submitUIC should handle undefined period id and refresh EXAMEN_COMPLEXIVO modality', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    activePeriodId$.next(null);

    component.carreras = [{ id: 1, nombre: 'SISTEMAS' }];
    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 9;
    component.canChooseModality = true;

    component.submitUIC();
    expect(enrollMock.select).toHaveBeenCalledWith('UIC', undefined);

    enrollMock.current.and.returnValue(of({ modality: 'EXAMEN_COMPLEXIVO' }));
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(component.uicSubmitted).toBeTrue();
    expect(modalitySvcMock.set).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');
  }));

  it('submitUIC should keep uicSubmitted true when refresh current is null', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    activePeriodId$.next(5);

    component.carreras = [{ id: 1, nombre: 'SISTEMAS' }];
    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 9;
    component.canChooseModality = true;
    component.uicSubmitted = true;

    component.submitUIC();
    enrollMock.current.and.returnValue(of(null));
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(component.uicSubmitted).toBeTrue();
  }));

  it('submitUIC should allow careerName empty and keep existing uicTopicId when saved.id missing', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    activePeriodId$.next(5);
    current$.next({});

    component.uicTopicId = 77;
    component.carreras = [];
    component.uic.tema = 'Tema';
    component.selectedCareerId = 123;
    component.selectedTutorId = 9;
    component.canChooseModality = true;

    httpClientMock.post.and.returnValue(of({}));
    component.submitUIC();
    expect(component.uicTopicId).toBe(77);

    enrollMock.current.and.returnValue(of({ modality: 'UIC' }));
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(component.uicSubmitted).toBeTrue();
  }));

  it('submitUIC should handle post error', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    httpClientMock.post.and.returnValue(throwError(() => new Error('X')));

    component.uic.tema = 'Tema';
    component.selectedCareerId = 1;
    component.selectedTutorId = 2;
    component.canChooseModality = true;

    component.submitUIC();
    expect(component.isLoading).toBeFalse();
    expect(component.showToast).toBeFalse();
    expect(component.toastMsg).toContain('No se pudo guardar');
  }));

  it('chooseUIC should set preselect and tab when allowed', () => {
    fixture.detectChanges();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');

    component.isLoading = false;
    component.current = null;
    component.canChooseModality = true;
    component.chooseUIC();
    expect(component.preselectUIC).toBeTrue();
    expect(component.activeTab).toBe('uic');

    component.preselectUIC = false;
    component.current = { modality: 'UIC' } as any;
    component.chooseUIC();
    expect(component.preselectUIC).toBeFalse();
  });

  it('chooseUIC should early return when blocked', () => {
    fixture.detectChanges();
    component.isLoading = true;
    component.preselectUIC = false;
    component.chooseUIC();
    expect(component.preselectUIC).toBeFalse();

    component.isLoading = false;
    component.current = { modality: 'UIC' } as any;
    component.chooseUIC();
    expect(component.preselectUIC).toBeFalse();

    component.current = null;
    component.canChooseModality = false;
    component.chooseUIC();
    expect(component.preselectUIC).toBeFalse();
  });

  it('chooseComplexivo and elegirComplexivo should handle gating branches and set flags', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/docentes');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/carreras');
    expect(httpClientMock.get).toHaveBeenCalledWith('/api/uic/topic');

    component.isLoading = false;
    component.current = null;
    component.canChooseModality = true;
    activePeriodId$.next(7);

    component.chooseComplexivo();
    expect(enrollMock.select).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO', 7);

    // ensure the refresh call inside select->next sees an emitted value
    enrollMock.current.and.returnValue(of({ modality: 'EXAMEN_COMPLEXIVO' }));
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(component.complexivoSelected).toBeTrue();
    expect(component.activeTab).toBe('complexivo');
    expect(modalitySvcMock.set).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');

    component.canChooseModality = false;
    component.validationsMsg = 'X';
    component.elegirComplexivo();
    expect(component.toastMsg).toBe('X');
  }));

  it('chooseComplexivo should not sync sidebar when refresh current returns null', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();

    component.isLoading = false;
    component.current = null;
    component.canChooseModality = true;
    activePeriodId$.next(7);

    // refresh current returns null -> mod undefined
    enrollMock.current.and.returnValue(of(null));

    component.chooseComplexivo();
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(component.activeTab).toBe('complexivo');
    expect(modalitySvcMock.set).not.toHaveBeenCalledWith('UIC');
    expect(modalitySvcMock.set).not.toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');
  }));

  it('chooseComplexivo should pass undefined period id when missing', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();

    component.isLoading = false;
    component.current = null;
    component.canChooseModality = true;
    activePeriodId$.next(null);

    enrollMock.current.and.returnValue(of({ modality: 'EXAMEN_COMPLEXIVO' }));
    component.chooseComplexivo();
    expect(enrollMock.select).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO', undefined);
  }));

  it('chooseComplexivo should refresh current with undefined period id', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();

    component.isLoading = false;
    component.current = null;
    component.canChooseModality = true;
    activePeriodId$.next(null);

    enrollMock.current.and.returnValue(of({ modality: 'UIC' }));
    component.chooseComplexivo();
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(enrollMock.current).toHaveBeenCalledWith(undefined);
    expect(component.uicSubmitted).toBeTrue();
  }));

  it('elegirComplexivo should use fallback gating message when validationsMsg empty', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    component.canChooseModality = false;
    component.validationsMsg = '';
    component.elegirComplexivo();
    expect(component.toastMsg).toBe('No puedes elegir modalidad aún.');
  }));

  it('chooseComplexivo should early return when selectedModality already set', () => {
    fixture.detectChanges();
    component.isLoading = false;
    component.current = { modality: 'UIC' } as any;
    component.chooseComplexivo();
    expect(enrollMock.select).not.toHaveBeenCalled();
  });

  it('elegirComplexivo should select and sync modality on success', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    component.canChooseModality = true;
    activePeriodId$.next(12);

    enrollMock.current.and.returnValue(of({ modality: 'EXAMEN_COMPLEXIVO' }));
    component.elegirComplexivo();
    expect(enrollMock.select).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO', 12);
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(modalitySvcMock.set).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO');
  }));

  it('elegirComplexivo should pass undefined period id when missing', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    component.canChooseModality = true;
    activePeriodId$.next(null);

    enrollMock.current.and.returnValue(of({ modality: 'EXAMEN_COMPLEXIVO' }));
    component.elegirComplexivo();
    expect(enrollMock.select).toHaveBeenCalledWith('EXAMEN_COMPLEXIVO', undefined);
  }));

  it('elegirComplexivo should refresh current with undefined period id and null response', fakeAsync(() => {
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);
    fixture.detectChanges();
    component.canChooseModality = true;
    activePeriodId$.next(null);

    enrollMock.current.and.returnValue(of(null));
    component.elegirComplexivo();
    select$.next({});
    select$.complete();
    flushMicrotasks();
    expect(enrollMock.current).toHaveBeenCalledWith(undefined);
    expect(component.current).toBeNull();
  }));
});
