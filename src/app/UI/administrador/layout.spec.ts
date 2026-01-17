import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { AdministradorLayout } from './layout';
import { AuthService, User } from '../../services/auth.service';

describe('AdministradorLayout', () => {
  let component: AdministradorLayout;
  let fixture: ComponentFixture<AdministradorLayout>;

  let currentUserSubject: Subject<User | null>;
  let authMock: { currentUserValue: User | null; currentUser$: any; logout: jasmine.Spy };

  function createComponent() {
    fixture = TestBed.createComponent(AdministradorLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    currentUserSubject = new Subject<User | null>();

    authMock = {
      currentUserValue: null,
      currentUser$: currentUserSubject.asObservable(),
      logout: jasmine.createSpy('logout'),
    };

    await TestBed.configureTestingModule({
      imports: [AdministradorLayout],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authMock,
        },
      ],
    }).compileComponents();
  });

  it('should create with defaults when no user', () => {
    createComponent();
    expect(component).toBeTruthy();
    expect(component.userName).toBe('Administrador');
    expect(component.userRole).toBe('Administrador');
    expect(component.userInitials).toBe('A');
  });

  it('should init from currentUserValue and map role', () => {
    authMock.currentUserValue = {
      id_user: 1,
      email: 'a@a.com',
      firstname: 'Juan',
      lastname: 'Perez',
      roles: ['Tesoreria'],
      is_active: true,
    };

    createComponent();
    expect(component.userName).toBe('Juan Perez');
    expect(component.userRole).toBe('Tesorería');
    expect(component.userInitials).toBe('JP');
  });

  it('should update user when currentUser$ emits and reset when null', () => {
    createComponent();

    currentUserSubject.next({
      id_user: 2,
      email: 'b@b.com',
      firstname: 'Ana',
      lastname: 'Lopez',
      roles: ['Secretaria'],
      is_active: true,
    });
    fixture.detectChanges();

    expect(component.userName).toBe('Ana Lopez');
    expect(component.userRole).toBe('Secretaría');
    expect(component.userInitials).toBe('AL');

    currentUserSubject.next(null);
    fixture.detectChanges();

    expect(component.userName).toBe('Administrador');
    expect(component.userRole).toBe('Invitado');
  });

  it('should map unknown role to Usuario', () => {
    authMock.currentUserValue = {
      id_user: 3,
      email: 'c@c.com',
      firstname: 'X',
      lastname: 'Y',
      roles: ['OTRO'],
      is_active: true,
    };
    createComponent();
    expect(component.userRole).toBe('Usuario');
  });

  it('toggleProfile should toggle isProfileOpen', () => {
    createComponent();
    expect(component.isProfileOpen).toBeFalse();
    component.toggleProfile();
    expect(component.isProfileOpen).toBeTrue();
    component.toggleProfile();
    expect(component.isProfileOpen).toBeFalse();
  });

  it('logout should close profile and call auth.logout', () => {
    createComponent();
    component.isProfileOpen = true;
    component.logout();
    expect(component.isProfileOpen).toBeFalse();
    expect(authMock.logout).toHaveBeenCalled();
  });
});
