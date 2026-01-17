import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { InglesLayout } from './layout';
import { PeriodService } from '../../services/period.service';
import { AuthService, User } from '../../services/auth.service';

describe('InglesLayout', () => {
  let component: InglesLayout;
  let fixture: ComponentFixture<InglesLayout>;

  let activePeriod$: Subject<string | null>;
  let currentUser$: Subject<User | null>;

  let periodMock: any;
  let authMock: any;

  function createComponent() {
    fixture = TestBed.createComponent(InglesLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    activePeriod$ = new Subject<string | null>();
    currentUser$ = new Subject<User | null>();

    periodMock = {
      loadingActive$: of(false),
      loadingList$: of(false),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue('2024-1'),
      activePeriod$: activePeriod$.asObservable(),
      fetchAndSetFromBackend: jasmine.createSpy('fetchAndSetFromBackend').and.returnValue(of(void 0)),
      listAll: jasmine.createSpy('listAll').and.returnValue(of([{ name: '2024-1' }, { name: '2024-2' }])),
      setActivePeriod: jasmine.createSpy('setActivePeriod'),
    };

    authMock = {
      currentUserValue: null,
      currentUser$: currentUser$.asObservable(),
      hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
      logout: jasmine.createSpy('logout'),
    };

    await TestBed.configureTestingModule({
      imports: [InglesLayout],
      providers: [
        provideRouter([]),
        { provide: PeriodService, useValue: periodMock },
        { provide: AuthService, useValue: authMock },
      ],
    })
      .overrideComponent(InglesLayout, { set: { template: '' } })
      .compileComponents();
  });

  it('should create with defaults when no user', () => {
    createComponent();
    expect(component).toBeTruthy();
    expect(component.userName).toBe('Usuario');
    expect(component.userRole).toBe('Usuario');
    expect(component.userInitials).toBe('U');
    expect(component.isAdmin).toBeFalse();
    expect(component.activePeriod).toBe('2024-1');
    expect(periodMock.fetchAndSetFromBackend).toHaveBeenCalled();
    expect(periodMock.listAll).toHaveBeenCalled();
    expect(component.periodOptions).toEqual(['2024-1', '2024-2']);
  });

  it('should init from currentUserValue and map role + admin', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'x@x.com',
      firstname: 'Ana',
      lastname: 'Lopez',
      roles: ['Ingles'],
      is_active: true,
    };
    authMock.hasRole.and.returnValue(true);

    createComponent();
    expect(component.userName).toBe('Ana Lopez');
    expect(component.userRole).toBe('Inglés');
    expect(component.isAdmin).toBeTrue();
  });

  it('should update when currentUser$ emits null/user', () => {
    createComponent();

    authMock.hasRole.and.returnValue(true);
    currentUser$.next({
      id_user: 2,
      email: 'b@b.com',
      firstname: 'Juan',
      lastname: 'Perez',
      roles: ['Administrador'],
      is_active: true,
    });
    fixture.detectChanges();

    expect(component.userName).toBe('Juan Perez');
    expect(component.userRole).toBe('Administrador');
    expect(component.isAdmin).toBeTrue();

    currentUser$.next(null);
    fixture.detectChanges();

    expect(component.userName).toBe('Usuario');
    expect(component.userRole).toBe('Invitado');
    expect(component.isAdmin).toBeFalse();
  });

  it('should sync active period from service and allow onChangePeriod', () => {
    createComponent();
    activePeriod$.next('2024-2');
    fixture.detectChanges();
    expect(component.activePeriod).toBe('2024-2');

    component.onChangePeriod('2024-1');
    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2024-1');
  });

  it('toggleProfile/logout should update state and call auth.logout', () => {
    createComponent();
    expect(component.isProfileOpen).toBeFalse();
    component.toggleProfile();
    expect(component.isProfileOpen).toBeTrue();
    component.logout();
    expect(component.isProfileOpen).toBeFalse();
    expect(authMock.logout).toHaveBeenCalled();
  });

  it('mapRole should fallback to provided role when not mapped', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'x@x.com',
      firstname: 'A',
      lastname: 'B',
      roles: ['OtroRol'],
      is_active: true,
    };
    createComponent();
    expect(component.userRole).toBe('OtroRol');
  });

  it('mapRole should default to Usuario for empty role and userInitials should handle single name', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'x@x.com',
      firstname: 'Solo',
      lastname: '',
      roles: [''],
      is_active: true,
    };
    createComponent();
    expect(component.userRole).toBe('Usuario');
    expect(component.userInitials).toBe('S');
  });

  it('period loading getters should return observables', () => {
    createComponent();
    expect(component.periodLoading$).toBeTruthy();
    expect(component.periodListLoading$).toBeTruthy();
  });

  it('should handle null active period and null listAll result', () => {
    periodMock.getActivePeriod.and.returnValue(null);
    periodMock.listAll.and.returnValue(of(null));
    createComponent();
    expect(component.activePeriod).toBeNull();
    expect(component.periodOptions).toEqual([]);
  });

  it('userInitials should fallback to U when userName is blank', () => {
    createComponent();
    component.userName = '';
    expect(component.userInitials).toBe('U');
  });
});
