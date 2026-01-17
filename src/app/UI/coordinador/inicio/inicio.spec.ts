import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { HttpTestingController } from '@angular/common/http/testing';

import { Inicio } from './inicio';
import { NotificationsService } from '../../../services/notifications.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let httpMock: HttpTestingController;
  let notificationsMock: {
    listMy: jasmine.Spy;
    markRead: jasmine.Spy;
    markAllRead: jasmine.Spy;
  };

  beforeEach(async () => {
    notificationsMock = {
      listMy: jasmine.createSpy('listMy').and.returnValue(of([
        { id_notification: 1, title: 'T1', created_at: '2026-01-01T00:00:00.000Z', is_read: false },
        { id_notification: 2, title: 'T2', created_at: '2026-01-02T00:00:00.000Z', is_read: true },
      ] as any)),
      markRead: jasmine.createSpy('markRead').and.returnValue(of(void 0)),
      markAllRead: jasmine.createSpy('markAllRead').and.returnValue(of(void 0)),
    };

    await TestBed.configureTestingModule({
      imports: [Inicio, HttpClientTestingModule],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 });
    expect(component).toBeTruthy();
  });

  it('should load dashboard metrics from backend', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 10, sinTutor: 2, totalEstudiantes: 50, uicPercent: 60, complexivoPercent: 40 });
    expect(component.totalEnProceso).toBe(10);
    expect(component.sinTutor).toBe(2);
    expect(component.totalEstudiantes).toBe(50);
    expect(component.uicPercent).toBe(60);
    expect(component.complexivoPercent).toBe(40);
  });

  it('should fall back to zeros when dashboard request fails', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.totalEnProceso).toBe(0);
    expect(component.sinTutor).toBe(0);
    expect(component.totalEstudiantes).toBe(0);
    expect(component.uicPercent).toBe(0);
    expect(component.complexivoPercent).toBe(0);
  });

  it('should map notifications list and computed getters', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 });
    expect(component.notifications.length).toBe(2);
    expect(component.notificationsCount).toBe(2);
    expect(component.pendingCount).toBe(1);
    expect(component.visibleNotifications.length).toBe(1);
    component.onlyUnread = false;
    expect(component.visibleNotifications.length).toBe(2);
  });

  it('toggleNotif should toggle panel flags', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 });
    expect(component.panelNotificacionesAbierto).toBeFalse();
    expect(component.isNotifOpen).toBeFalse();
    component.toggleNotif();
    expect(component.panelNotificacionesAbierto).toBeTrue();
    expect(component.isNotifOpen).toBeTrue();
  });

  it('marcarLeida should mark notification as read', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 });
    expect(component.notifications[0].leida).toBeFalse();
    component.marcarLeida({ id: 1 });
    expect(notificationsMock.markRead).toHaveBeenCalledWith(1);
    expect(component.notifications[0].leida).toBeTrue();
  });

  it('marcarTodasLeidas should mark all as read', () => {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, sinTutor: 0, totalEstudiantes: 0, uicPercent: 0, complexivoPercent: 0 });
    component.marcarTodasLeidas();
    expect(notificationsMock.markAllRead).toHaveBeenCalled();
    expect(component.notifications.every(n => n.leida)).toBeTrue();
  });
});
