import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';

import { CoordinadorLayout } from './layout';
import { AuthService, User } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';

describe('CoordinadorLayout', () => {
  let component: CoordinadorLayout;
  let fixture: ComponentFixture<CoordinadorLayout>;

  let routerEvents$: Subject<any>;
  let currentUser$: Subject<User | null>;
  let activePeriod$: Subject<string | null>;

  let routerMock: { events: any };
  let authMock: {
    currentUserValue: User | null;
    currentUser$: any;
    hasRole: jasmine.Spy;
    logout: jasmine.Spy;
  };
  let periodMock: {
    activePeriod$: any;
    getActivePeriod: jasmine.Spy;
    fetchAndSetFromBackend: jasmine.Spy;
  };

  function createComponent() {
    fixture = TestBed.createComponent(CoordinadorLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    routerEvents$ = new Subject<any>();
    currentUser$ = new Subject<User | null>();
    activePeriod$ = new Subject<string | null>();

    routerMock = { events: routerEvents$.asObservable() };
    authMock = {
      currentUserValue: null,
      currentUser$: currentUser$.asObservable(),
      hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
      logout: jasmine.createSpy('logout'),
    };
    periodMock = {
      activePeriod$: activePeriod$.asObservable(),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue('2024-1'),
      fetchAndSetFromBackend: jasmine.createSpy('fetchAndSetFromBackend').and.returnValue(new Subject<void>().asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [CoordinadorLayout],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authMock },
        { provide: PeriodService, useValue: periodMock },
      ],
    })
      .overrideComponent(CoordinadorLayout, { set: { template: '' } })
      .compileComponents();
  });

  it('should create with defaults when no user', () => {
    createComponent();
    expect(component).toBeTruthy();
    expect(component.userName).toBe('Coordinador');
    expect(component.userRole).toBe('Coordinador');
    expect(component.userInitials).toBe('C');
    expect(component.isAdmin).toBeFalse();
    expect(periodMock.getActivePeriod).toHaveBeenCalled();
  });

  it('should init from currentUserValue and set isAdmin using hasRole', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'a@a.com',
      firstname: 'Juan',
      lastname: 'Perez',
      roles: ['Coordinador'],
      is_active: true,
    };
    authMock.hasRole.and.returnValue(true);

    createComponent();
    expect(component.userName).toBe('Juan Perez');
    expect(component.userRole).toBe('Coordinador');
    expect(component.userInitials).toBe('JP');
    expect(component.isAdmin).toBeTrue();
  });

  it('should update from currentUser$ emissions', () => {
    createComponent();

    authMock.hasRole.and.returnValue(true);
    currentUser$.next({
      id_user: 2,
      email: 'b@b.com',
      firstname: 'Ana',
      lastname: 'Lopez',
      roles: ['Administrador'],
      is_active: true,
    });
    fixture.detectChanges();

    expect(component.userName).toBe('Ana Lopez');
    expect(component.userRole).toBe('Administrador');
    expect(component.isAdmin).toBeTrue();

    currentUser$.next(null);
    fixture.detectChanges();

    expect(component.userName).toBe('Coordinador');
    expect(component.userRole).toBe('Invitado');
  });

  it('should sync activePeriod from service', () => {
    createComponent();
    expect(component.activePeriod).toBe('2024-1');
    activePeriod$.next('2024-2');
    fixture.detectChanges();
    expect(component.activePeriod).toBe('2024-2');
  });

  it('toggleProfile/toggleCronos/toggleComision should toggle flags', () => {
    createComponent();
    expect(component.isProfileOpen).toBeFalse();
    component.toggleProfile();
    expect(component.isProfileOpen).toBeTrue();

    expect(component.cronosOpen).toBeFalse();
    component.toggleCronos();
    expect(component.cronosOpen).toBeTrue();

    expect(component.comisionOpen).toBeFalse();
    component.toggleComision();
    expect(component.comisionOpen).toBeTrue();
  });

  it('should close dropdowns on navigation outside their routes', () => {
    createComponent();
    component.cronosOpen = true;
    component.comisionOpen = true;

    routerEvents$.next(new NavigationEnd(1, '/coordinador/inicio', '/coordinador/inicio'));
    fixture.detectChanges();

    expect(component.cronosOpen).toBeFalse();
    expect(component.comisionOpen).toBeFalse();
  });

  it('should keep dropdowns open when navigating inside their routes', () => {
    createComponent();
    component.cronosOpen = true;
    component.comisionOpen = true;

    routerEvents$.next(new NavigationEnd(1, '/coordinador/cronogramas/uic', '/coordinador/cronogramas/uic'));
    fixture.detectChanges();
    expect(component.cronosOpen).toBeTrue();

    component.comisionOpen = true;
    routerEvents$.next(new NavigationEnd(2, '/coordinador/comision/asignar-tutor', '/coordinador/comision/asignar-tutor'));
    fixture.detectChanges();
    expect(component.comisionOpen).toBeTrue();
  });

  it('logout should close profile and call auth.logout', () => {
    createComponent();
    component.isProfileOpen = true;
    component.logout();
    expect(component.isProfileOpen).toBeFalse();
    expect(authMock.logout).toHaveBeenCalled();
  });
});
