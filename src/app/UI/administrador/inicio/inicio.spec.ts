import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, skip, take } from 'rxjs';

import { Inicio } from './inicio';
import { PeriodService } from '../../../services/period.service';
import { NotificationsService } from '../../../services/notifications.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;
  let httpMock: HttpTestingController;
  let periodSvcMock: {
    activePeriod$: any;
    loadingActive$: any;
    getActivePeriod: jasmine.Spy;
    fetchAndSetFromBackend: jasmine.Spy;
  };

  beforeEach(async () => {
    periodSvcMock = {
      activePeriod$: of(null),
      loadingActive$: of(false),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue(''),
      fetchAndSetFromBackend: jasmine.createSpy('fetchAndSetFromBackend').and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [Inicio, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        {
          provide: PeriodService,
          useValue: periodSvcMock,
        },
        {
          provide: NotificationsService,
          useValue: { listMy: () => of([]), markRead: () => of(void 0), markAllRead: () => of(void 0) },
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

  function flushInitHttpCalls() {
    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5').flush([]);
  }

  it('should create', () => {
    createComponent();
    flushInitHttpCalls();
    expect(component).toBeTruthy();
  });

  it('should fetch active period from backend when no active period', () => {
    createComponent();
    flushInitHttpCalls();
    expect(periodSvcMock.getActivePeriod).toHaveBeenCalled();
    expect(periodSvcMock.fetchAndSetFromBackend).toHaveBeenCalled();
  });

  it('should not fetch active period from backend when active period exists', () => {
    periodSvcMock.getActivePeriod.and.returnValue('2024-1');
    periodSvcMock.fetchAndSetFromBackend.calls.reset();

    createComponent();
    flushInitHttpCalls();
    expect(periodSvcMock.fetchAndSetFromBackend).not.toHaveBeenCalled();
  });

  it('should map dashboard response', (done) => {
    createComponent();

    component.dash$.subscribe((v) => {
      if (!v) return;
      expect(v).toEqual({ totalEnProceso: 12, uicPercent: 60, complexivoPercent: 40 });
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 12, uicPercent: 60, complexivoPercent: 40 });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5').flush([]);
  });

  it('should load recent notifications list', (done) => {
    createComponent();

    component.recent$.subscribe((list) => {
      expect(list.length).toBe(1);
      expect(list[0].id_notification).toBe(1);
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5')
      .flush([{ id_notification: 1, title: 'T', message: 'M', created_at: '2026-01-01T00:00:00.000Z' }]);
  });

  it('should map dashboard response using totalEstudiantes as fallback', (done) => {
    createComponent();

    component.dash$.pipe(skip(1), take(1)).subscribe((v) => {
      expect(v).toEqual({ totalEnProceso: 99, uicPercent: 10, complexivoPercent: 90 });
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard').flush({ totalEstudiantes: 99, uicPercent: 10, complexivoPercent: 90 });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5').flush([]);
  });

  it('should fallback dashboard values on error', (done) => {
    createComponent();

    component.dash$.pipe(skip(1), take(1)).subscribe((v) => {
      expect(v).toEqual({ totalEnProceso: 0, uicPercent: 0, complexivoPercent: 0 });
      done();
    });

    httpMock.expectOne('/api/uic/admin/dashboard').flush('X', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5').flush([]);
  });

  it('dashLoading$ and recentLoading$ should start true then become false', (done) => {
    createComponent();

    let dashStart = false;
    let dashEnd = false;
    let recentStart = false;
    let recentEnd = false;

    component.dashLoading$.subscribe((v) => {
      if (!dashStart) { expect(v).toBeTrue(); dashStart = true; return; }
      if (!dashEnd && v === false) { dashEnd = true; if (dashEnd && recentEnd) done(); }
    });
    component.recentLoading$.subscribe((v) => {
      if (!recentStart) { expect(v).toBeTrue(); recentStart = true; return; }
      if (!recentEnd && v === false) { recentEnd = true; if (dashEnd && recentEnd) done(); }
    });

    httpMock.expectOne('/api/uic/admin/dashboard').flush('X', { status: 500, statusText: 'Server Error' });
    httpMock.expectOne('/api/notifications/admin/recent?limit=5').flush('X', { status: 500, statusText: 'Server Error' });
  });
});
