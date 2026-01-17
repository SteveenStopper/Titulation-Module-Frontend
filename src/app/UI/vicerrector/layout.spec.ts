import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import { VicerrectorLayout } from './layout';
import { PeriodService } from '../../services/period.service';
import { AuthService, User } from '../../services/auth.service';

describe('VicerrectorLayout', () => {
  let component: VicerrectorLayout;
  let fixture: ComponentFixture<VicerrectorLayout>;

  let activePeriod$: Subject<string | null>;
  let currentUser$: Subject<User | null>;

  let periodMock: any;
  let authMock: any;

  function createComponent() {
    fixture = TestBed.createComponent(VicerrectorLayout);
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
      imports: [VicerrectorLayout],
      providers: [
        provideRouter([]),
        { provide: PeriodService, useValue: periodMock },
        { provide: AuthService, useValue: authMock },
      ],
    })
      .overrideComponent(VicerrectorLayout, { set: { template: '' } })
      .compileComponents();
  });

  it('should create with defaults when no user', () => {
    createComponent();
    expect(component).toBeTruthy();
    expect(component.userName).toBe('Vicerrector');
    expect(component.userRole).toBe('Vicerrector');
    expect(component.userInitials).toBe('V');
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
      roles: ['Vicerrector'],
      is_active: true,
    };
    authMock.hasRole.and.returnValue(true);

    createComponent();
    expect(component.userName).toBe('Ana Lopez');
    expect(component.userRole).toBe('Vicerrector');
    expect(component.isAdmin).toBeTrue();
  });

  it('should map role as Usuario when role is missing/unknown', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'x@x.com',
      firstname: 'Ana',
      lastname: 'Lopez',
      roles: [],
      is_active: true,
    };

    createComponent();
    expect(component.userRole).toBe('Usuario');

    currentUser$.next({
      id_user: 2,
      email: 'y@y.com',
      firstname: 'B',
      lastname: 'C',
      roles: ['ROLE_X'],
      is_active: true,
    } as any);
    fixture.detectChanges();
    expect(component.userRole).toBe('Usuario');
  });

  it('should update when currentUser$ emits user/null', () => {
    createComponent();

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

    currentUser$.next(null);
    fixture.detectChanges();

    expect(component.userName).toBe('Vicerrector');
    expect(component.userRole).toBe('Invitado');
  });

  it('should sync active period and allow onChangePeriod', () => {
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

  it('should handle null active period and null listAll result', () => {
    periodMock.getActivePeriod.and.returnValue(null);
    periodMock.listAll.and.returnValue(of(null));
    createComponent();
    expect(component.activePeriod).toBeNull();
    expect(component.periodOptions).toEqual([]);
  });

  it('periodLoading$ and periodListLoading$ should expose service observables', () => {
    createComponent();
    expect(component.periodLoading$).toBe(periodMock.loadingActive$);
    expect(component.periodListLoading$).toBe(periodMock.loadingList$);
  });

  it('userInitials should fallback to V when userName is blank', () => {
    createComponent();
    component.userName = '';
    expect(component.userInitials).toBe('V');
  });
});
