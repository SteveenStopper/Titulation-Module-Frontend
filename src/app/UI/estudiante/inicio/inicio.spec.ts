import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { Inicio } from './inicio';
import { EnrollmentsService } from '../../../services/enrollments.service';
import { StudentApiService } from '../../../services/student-api.service';
import { DocumentsService } from '../../../services/documents.service';
import { MeService } from '../../../services/me.service';
import { NotificationsService } from '../../../services/notifications.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;

  let enrollMock: any;
  let studentApiMock: any;
  let docsMock: any;
  let meMock: any;
  let notifMock: any;

  let activePeriodId$: BehaviorSubject<any>;
  let currentResp$: Subject<any>;

  function createComponent() {
    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    activePeriodId$ = new BehaviorSubject<any>(null);
    currentResp$ = new Subject<any>();

    enrollMock = {
      current: jasmine.createSpy('current').and.callFake(() => currentResp$.asObservable()),
    };
    studentApiMock = {
      getActivePeriodId$: jasmine.createSpy('getActivePeriodId$').and.returnValue(activePeriodId$.asObservable()),
    };
    docsMock = {
      list: jasmine.createSpy('list').and.returnValue(of({ data: [] })),
      download: jasmine.createSpy('download').and.returnValue(of(new Blob())),
    };
    meMock = {
      getProfile: jasmine.createSpy('getProfile').and.returnValue(of({ user: { id_user: 1 }, validations: {} })),
    };
    notifMock = {
      listMy: jasmine.createSpy('listMy').and.returnValue(of([])),
      markRead: jasmine.createSpy('markRead').and.returnValue(of(void 0)),
      markAllRead: jasmine.createSpy('markAllRead').and.returnValue(of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [
        provideRouter([]),
        { provide: EnrollmentsService, useValue: enrollMock },
        { provide: StudentApiService, useValue: studentApiMock },
        { provide: DocumentsService, useValue: docsMock },
        { provide: MeService, useValue: meMock },
        { provide: NotificationsService, useValue: notifMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('toggleNotif should sync booleans', () => {
    createComponent();
    expect(component.panelNotificacionesAbierto).toBeFalse();
    expect(component.isNotifOpen).toBeFalse();
    component.toggleNotif();
    expect(component.panelNotificacionesAbierto).toBeTrue();
    expect(component.isNotifOpen).toBeTrue();
  });

  it('pendingCount/visibleNotificaciones should respect onlyUnread', () => {
    createComponent();
    component.notificaciones = [
      { id: 1, titulo: 'T1', detalle: 'D1', fecha: 'F1', leida: false },
      { id: 2, titulo: 'T2', detalle: 'D2', fecha: 'F2', leida: true },
    ];
    expect(component.pendingCount).toBe(1);
    component.onlyUnread = true;
    expect(component.visibleNotificaciones.map(x => x.id)).toEqual([1]);
    component.onlyUnread = false;
    expect(component.visibleNotificaciones.map(x => x.id)).toEqual([1, 2]);
  });

  it('modalidadSeleccionadaLabel and estadoMatriculaLabel should cover branches', () => {
    createComponent();

    component.currentEnrollment = { modality: 'UIC' } as any;
    expect(component.modalidadSeleccionadaLabel).toBe('UIC');
    component.currentEnrollment = { modality: 'EXAMEN_COMPLEXIVO' } as any;
    expect(component.modalidadSeleccionadaLabel).toBe('Examen Complexivo');
    component.currentEnrollment = { modality: null } as any;
    expect(component.modalidadSeleccionadaLabel).toBe('Sin seleccionar');

    component.currentEnrollment = null;
    expect(component.estadoMatriculaLabel).toBe('Sin proceso');
    component.currentEnrollment = { status: 'approved' } as any;
    expect(component.estadoMatriculaLabel).toBe('Aprobada');
    component.currentEnrollment = { status: 'in_progress' } as any;
    expect(component.estadoMatriculaLabel).toBe('En proceso');
    component.currentEnrollment = { status: 'submitted' } as any;
    expect(component.estadoMatriculaLabel).toBe('Enviado');
    component.currentEnrollment = { status: 'custom_state' } as any;
    expect(component.estadoMatriculaLabel).toBe('Custom state');
  });

  it('ngOnInit should map notifications, load current enrollment, and compute profile metrics', () => {
    notifMock.listMy.and.returnValue(of([
      { id_notification: '10', title: 'Hello', message: 'Msg', created_at: '2024-01-01T00:00:00Z', is_read: 0 },
      { id_notification: 11, title: null, message: null, created_at: '2024-01-02T00:00:00Z', is_read: true },
    ]));

    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'approved' },
        secretaria_promedios: { estado: 'rejected' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: 'solicitud', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
          { document_type: 'oficio', status: 'aprobado', created_at: '2024-01-15T00:00:00Z' },
          { doc_type: 'cert_ingles', status: 'aprobado', createdAt: '2024-03-01T00:00:00Z' },
          { tipo: '', estado: 'aprobado', created_at: '2024-01-20T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.notificaciones.length).toBe(2);
    expect(component.notificaciones[0].id).toBe(10);
    expect(component.notificaciones[0].titulo).toBe('Hello');
    expect(component.notificaciones[0].leida).toBeFalse();
    expect(component.pagosEstado).toBe('aprobado');
    expect(component.notasEstado).toBe('rechazado');
    expect(component.documentosCount).toBe(5);

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});
    expect(estados['Solicitud']).toBe('rechazado');
    expect(estados['Oficio']).toBe('aprobado');
    expect(estados['Cert. de inglés']).toBe('aprobado');

    activePeriodId$.next(123);
    expect(enrollMock.current).toHaveBeenCalledWith(123);
    currentResp$.next({ status: 'approved', modality: 'UIC' });
    currentResp$.complete();
    expect(component.currentEnrollment as any).toEqual({ status: 'approved', modality: 'UIC' });
  });

  it('ngOnInit should keep latest-by-date per tipo and not overwrite with older rows', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: 'solicitud', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'pendiente', creado_en: '2023-01-01T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});

    // latest is 'rechazado' and older should not overwrite it
    expect(estados['Solicitud']).toBe('rechazado');
    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');
  });

  it('ngOnInit should early return when profile has no id_user and handle docs list array response', () => {
    meMock.getProfile.and.returnValue(of({ user: { id_user: null } }));
    docsMock.list.and.returnValue(of([{ tipo: 'solicitud', estado: 'aprobado', created_at: '2024-01-01T00:00:00Z' }]));

    createComponent();
    component.ngOnInit();

    expect(docsMock.list).not.toHaveBeenCalled();
  });

  it('ngOnInit should accept docs list as array response (resp is array)', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'approved' },
        secretaria_promedios: { estado: 'approved' },
      },
    }));
    docsMock.list.and.returnValue(of([
      { tipo: 'solicitud', estado: 'aprobado', created_at: '2024-01-01T00:00:00Z' },
      { tipo: 'oficio', estado: 'rechazado', createdAt: '2024-02-01T00:00:00Z' },
    ] as any));

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(2);
    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});
    expect(estados['Solicitud']).toBe('aprobado');
    expect(estados['Oficio']).toBe('rechazado');
  });

  it('ngOnInit should cover resp array + tipo/status/createdAt fallbacks', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'approved' },
        secretaria_promedios: { estado: 'approved' },
      },
    }));

    docsMock.list.and.returnValue(of([
      // status undefined -> en_revision, createdAt undefined -> 0, tipo undefined -> ''
      { document_type: 'solicitud', status: undefined, createdAt: undefined },
      { doc_type: undefined, estado: undefined, createdAt: undefined },
    ] as any));

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(2);
    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});
    expect(estados['Solicitud']).toBe('pendiente');
  });

  it('ngOnInit should cover fallback branches with manual init (resp array)', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'approved' },
        secretaria_promedios: { estado: 'approved' },
      },
    }));

    docsMock.list.and.returnValue(of([
      { document_type: 'solicitud', status: undefined, createdAt: undefined },
      { doc_type: undefined, estado: undefined, createdAt: undefined },
    ] as any));

    const component = TestBed.createComponent(Inicio).componentInstance;
    component.ngOnInit();

    expect(component.documentosCount).toBe(2);
    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});
    expect(estados['Solicitud']).toBe('pendiente');
  });

  it('ngOnInit should handle listMy null and docs list null responses', () => {
    notifMock.listMy.and.returnValue(of(null as any));
    meMock.getProfile.and.returnValue(of({ user: { id_user: 1 }, validations: { tesoreria_aranceles: { estado: 'unknown' }, secretaria_promedios: { estado: null } } }));
    docsMock.list.and.returnValue(of(null as any));

    createComponent();
    component.ngOnInit();

    expect(component.notificaciones).toEqual([]);
    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');
    expect(component.documentosCount).toBe(0);
    expect(component.docEstados.length).toBe(5);
    expect(component.docEstados.every(x => x.estado === 'pendiente')).toBeTrue();
  });

  it('ngOnInit should call enroll.current with undefined when activePeriodId is 0/undefined and set currentEnrollment null when res falsy', () => {
    createComponent();
    component.ngOnInit();

    activePeriodId$.next(0);
    expect(enrollMock.current).toHaveBeenCalledWith(undefined);
    currentResp$.next(null);
    currentResp$.complete();
    expect(component.currentEnrollment).toBeNull();

    currentResp$ = new Subject<any>();
    enrollMock.current.and.callFake(() => currentResp$.asObservable());

    activePeriodId$.next(undefined);
    expect(enrollMock.current).toHaveBeenCalledWith(undefined);
  });

  it('estadoMatriculaLabel should return mapped labels for pending/rejected', () => {
    createComponent();
    component.currentEnrollment = { status: 'pending' } as any;
    expect(component.estadoMatriculaLabel).toBe('Pendiente');
    component.currentEnrollment = { status: 'rejected' } as any;
    expect(component.estadoMatriculaLabel).toBe('Rechazada');
  });

  it('marcarLeida should mark local notification on complete', () => {
    createComponent();
    component.notificaciones = [{ id: 1, titulo: 'T', detalle: 'D', fecha: 'F', leida: false }];
    component.marcarLeida({ id: 1 });
    expect(notifMock.markRead).toHaveBeenCalledWith(1);
    expect(component.notificaciones[0].leida).toBeTrue();
  });

  it('marcarLeida should not throw if id not found', () => {
    createComponent();
    component.notificaciones = [{ id: 1, titulo: 'T', detalle: 'D', fecha: 'F', leida: false }];
    component.marcarLeida({ id: 99 });
    expect(notifMock.markRead).toHaveBeenCalledWith(99);
    expect(component.notificaciones[0].leida).toBeFalse();
  });

  it('marcarTodasLeidas should mark all as read on complete', () => {
    createComponent();
    component.notificaciones = [
      { id: 1, titulo: 'T1', detalle: 'D1', fecha: 'F1', leida: false },
      { id: 2, titulo: 'T2', detalle: 'D2', fecha: 'F2', leida: true },
    ];
    component.marcarTodasLeidas();
    expect(notifMock.markAllRead).toHaveBeenCalled();
    expect(component.notificaciones.every(n => n.leida)).toBeTrue();
  });

  it('should handle invalid dates in notifications', () => {
    notifMock.listMy.and.returnValue(of([
      { id_notification: '10', title: 'Hello', message: 'Msg', created_at: 'invalid_date', is_read: 0 },
    ]));

    createComponent();
    component.ngOnInit();

    expect(component.notificaciones[0].fecha).toBe('Invalid Date');
  });

  it('should handle empty tipo in documents list', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: '', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(2);
  });

  it('should handle unknown estado in validations', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'unknown_estado' },
        secretaria_promedios: { estado: 'another_unknown' },
      },
    }));

    createComponent();
    component.ngOnInit();

    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');
  });

  it('should handle null validations in profile', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: null,
        secretaria_promedios: null,
      },
    }));

    createComponent();
    component.ngOnInit();

    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');
  });

  it('should handle undefined validations in profile', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {},
    }));

    createComponent();
    component.ngOnInit();

    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');
  });

  it('should skip items with empty tipo in the documents list', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: '', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(2);
    expect(component.docEstados.length).toBe(5); // Los 5 tipos requeridos siempre se muestran
  });

  it('should cover the default return in mapEstado and the continue in the for loop', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: '', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'solicitud', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
          { tipo: 'oficio', estado: 'unknown', creado_en: '2024-03-01T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(3);
    expect(component.docEstados.length).toBe(5); // Los 5 tipos requeridos siempre se muestran

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});

    // Verificar que el estado 'unknown' se mapee a 'pendiente'
    expect(estados['Oficio']).toBe('pendiente');
  });

  it('should handle invalid date in documents list and fallback to 0', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: 'solicitud', estado: 'aprobado', creado_en: 'invalid_date' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(1);
    expect(component.docEstados.length).toBe(5); // Los 5 tipos requeridos siempre se muestran

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});

    // Verificar que el estado 'aprobado' se mapee correctamente
    expect(estados['Solicitud']).toBe('aprobado');
  });

  it('should handle NaN date in documents list and fallback to 0', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'pending' },
        secretaria_promedios: { estado: 'pending' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: 'solicitud', estado: 'aprobado', creado_en: NaN as any },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.documentosCount).toBe(1);
    expect(component.docEstados.length).toBe(5); // Los 5 tipos requeridos siempre se muestran

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});

    // Verificar que el estado 'aprobado' se mapee correctamente
    expect(estados['Solicitud']).toBe('aprobado');
  });

    it('should cover all remaining branches', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: 'submitted' },
        secretaria_promedios: { estado: 'submitted' },
      },
    }));

    docsMock.list.and.returnValue(
      of({
        data: [
          { tipo: 'cert_vinculacion', estado: 'aprobado', creado_en: '2024-01-01T00:00:00Z' },
          { tipo: 'cert_practicas', estado: 'rechazado', creado_en: '2024-02-01T00:00:00Z' },
          { tipo: 'cert_ingles', estado: 'pendiente', creado_en: '2024-03-01T00:00:00Z' },
        ],
      })
    );

    createComponent();
    component.ngOnInit();

    expect(component.pagosEstado).toBe('pendiente');
    expect(component.notasEstado).toBe('pendiente');

    const estados = component.docEstados.reduce((acc: any, it: any) => {
      acc[it.nombre] = it.estado;
      return acc;
    }, {});

    expect(estados['Cert. de vinculación']).toBe('aprobado');
    expect(estados['Cert. de prácticas']).toBe('rechazado');
    expect(estados['Cert. de inglés']).toBe('pendiente');
  });
});