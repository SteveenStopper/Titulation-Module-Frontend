import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';

import { Inicio } from './inicio';
import { NotificationsService } from '../../../services/notifications.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let httpMock: HttpTestingController;

  let notifComplete$: Subject<void>;
  let notifAllComplete$: Subject<void>;

  beforeEach(async () => {
    notifComplete$ = new Subject<void>();
    notifAllComplete$ = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [Inicio, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: NotificationsService,
          useValue: {
            listMy: () => of([]),
            markRead: () => notifComplete$.asObservable(),
            markAllRead: () => notifAllComplete$.asObservable(),
          },
        },
      ],
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createComponent() {
    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    expect(component).toBeTruthy();
  });

  it('should map dashboard KPIs', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({
      carrerasActivas: 1,
      materiasRegistradas: 2,
      pendientesPublicar: 3,
      tutoresDisponibles: 4,
    });
    expect(component.resumen[0].valor).toBe(1);
    expect(component.resumen[1].valor).toBe(2);
    expect(component.resumen[2].valor).toBe(3);
    expect(component.resumen[3].valor).toBe(4);
  });

  it('should map notifications list and compute pendingCount/visibleNotifications', () => {
    const notifSvc = TestBed.inject(NotificationsService) as any;
    spyOn(notifSvc, 'listMy').and.returnValue(of([
      { id_notification: 1, title: 'A', created_at: '2026-01-01T00:00:00.000Z', is_read: false },
      { id_notification: 2, title: 'B', created_at: '2026-01-01T00:00:00.000Z', is_read: true },
    ]));

    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});

    expect(component.notifications.length).toBe(2);
    expect(component.pendingCount).toBe(1);
    expect(component.onlyUnread).toBeTrue();
    expect(component.visibleNotifications.length).toBe(1);

    component.onlyUnread = false;
    expect(component.visibleNotifications.length).toBe(2);
  });

  it('should handle null listMy response', () => {
    const notifSvc = TestBed.inject(NotificationsService) as any;
    spyOn(notifSvc, 'listMy').and.returnValue(of(null));
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    expect(component.notifications).toEqual([]);
    expect(component.pendingCount).toBe(0);
  });

  it('toggleNotif should toggle panel flags', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    expect(component.panelNotificacionesAbierto).toBeFalse();
    expect(component.isNotifOpen).toBeFalse();
    component.toggleNotif();
    expect(component.panelNotificacionesAbierto).toBeTrue();
    expect(component.isNotifOpen).toBeTrue();
  });

  it('marcarLeida should mark a notification as read on complete', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    component.notifications = [{ id: 1, text: 'A', time: 't', leida: false }];
    component.marcarLeida({ id: 1 });
    notifComplete$.complete();
    expect(component.notifications[0].leida).toBeTrue();
  });

  it('marcarLeida should do nothing when notification id is not found', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    component.notifications = [{ id: 2, text: 'A', time: 't', leida: false }];
    component.marcarLeida({ id: 99 });
    notifComplete$.complete();
    expect(component.notifications[0].leida).toBeFalse();
  });

  it('marcarTodasLeidas should mark all as read on complete', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    component.notifications = [
      { id: 1, text: 'A', time: 't', leida: false },
      { id: 2, text: 'B', time: 't', leida: false },
    ];
    component.marcarTodasLeidas();
    notifAllComplete$.complete();
    expect(component.notifications.every(n => n.leida)).toBeTrue();
  });

  it('visibleNotifications should return empty when onlyUnread=true and all are read', () => {
    createComponent();
    httpMock.expectOne('/api/vicerrector/dashboard').flush({});
    component.notifications = [
      { id: 1, text: 'A', time: 't', leida: true },
      { id: 2, text: 'B', time: 't', leida: true },
    ];
    component.onlyUnread = true;
    expect(component.visibleNotifications).toEqual([]);
    expect(component.pendingCount).toBe(0);
  });
});
