import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, NavigationEnd, Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { EstudianteLayout } from './layout';
import { AuthService } from '../../services/auth.service';
import { PeriodService } from '../../services/period.service';
import { ModalityService } from '../../services/modality.service';
import { MeService } from '../../services/me.service';

describe('EstudianteLayout', () => {
  let fixture: ComponentFixture<EstudianteLayout>;
  let component: EstudianteLayout;

  let routerEvents$: Subject<any>;
  let router: Router;

  let currentUser$: BehaviorSubject<any>;
  let activePeriod$: BehaviorSubject<any>;
  let modality$: BehaviorSubject<any>;

  let authMock: any;
  let periodMock: any;
  let modalityMock: any;
  let meMock: any;

  beforeEach(async () => {
    routerEvents$ = new Subject<any>();

    // Iniciar con un valor que no sea null para evitar el 'Invitado'
    currentUser$ = new BehaviorSubject<any>({ name: 'Estudiante', roles: ['Estudiante'] });
    authMock = {
      currentUserValue: { name: 'Estudiante', roles: ['Estudiante'] },
      currentUser$: currentUser$.asObservable(),
      logout: jasmine.createSpy('logout'),
    };

    activePeriod$ = new BehaviorSubject<any>('2024-1');
    periodMock = {
      loadingActive$: of(false),
      loadingList$: of(false),
      activePeriod$: activePeriod$.asObservable(),
      getActivePeriod: jasmine.createSpy('getActivePeriod').and.returnValue('2024-1'),
      setActivePeriod: jasmine.createSpy('setActivePeriod'),
      fetchAndSetFromBackend: jasmine.createSpy('fetchAndSetFromBackend').and.returnValue(of(null)),
      listAll: jasmine.createSpy('listAll').and.returnValue(of([{ name: '2024-1' }, { name: '2024-2' }])),
    };

    modality$ = new BehaviorSubject<any>(null);
    modalityMock = {
      modality$: modality$.asObservable(),
      refresh: jasmine.createSpy('refresh'),
    };

    // Cambiar el mock para que devuelva un usuario vacío
    meMock = {
      getProfile: jasmine
        .createSpy('getProfile')
        .and.returnValue(of({ user: null, activePeriod: null })),
    };

    await TestBed.configureTestingModule({
      imports: [EstudianteLayout],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
        { provide: AuthService, useValue: authMock },
        { provide: PeriodService, useValue: periodMock },
        { provide: ModalityService, useValue: modalityMock },
        { provide: MeService, useValue: meMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOnProperty(router, 'events', 'get').and.returnValue(routerEvents$.asObservable());

    fixture = TestBed.createComponent(EstudianteLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize with default values when currentUser has Estudiante role', () => {
    expect(component).toBeTruthy();
    expect(component.userName).toBe('Estudiante');
    expect(component.userRole).toBe('Estudiante');
    expect(modalityMock.refresh).toHaveBeenCalled();
  });

  it('should update user info when currentUser$ emits new values', () => {
    currentUser$.next({ name: 'John Doe', roles: ['Estudiante'] });
    expect(component.userName).toBe('John Doe');
    expect(component.userRole).toBe('Estudiante');

    currentUser$.next({ name: 'Jane Smith', roles: ['Docente'] });
    expect(component.userName).toBe('Jane Smith');
    expect(component.userRole).toBe('Docente');

    currentUser$.next(null);
    expect(component.userName).toBe('Estudiante');
    expect(component.userRole).toBe('Invitado');
  });

  it('should calculate user initials correctly', () => {
    expect(component.userInitials).toBe('E'); // Estudiante -> E

    // Cambiar el nombre internamente
    (component as any)['userName'] = 'John Doe';
    expect(component.userInitials).toBe('JD');

    (component as any)['userName'] = 'John';
    expect(component.userInitials).toBe('J');

    (component as any)['userName'] = '';
    expect(component.userInitials).toBe('U');
  });

  it('should handle navigation events and toggle menu states', () => {
    component.uicOpen = true;
    component.complexivoOpen = true;

    routerEvents$.next(new NavigationEnd(1, '/estudiante/cronograma-uic', '/estudiante/cronograma-uic'));
    expect(component.uicOpen).toBeTrue();
    expect(component.complexivoOpen).toBeFalse();

    component.uicOpen = true;
    component.complexivoOpen = true;

    routerEvents$.next(new NavigationEnd(2, '/estudiante/tutorias', '/estudiante/tutorias'));
    expect(component.uicOpen).toBeFalse();
    expect(component.complexivoOpen).toBeTrue();

    component.uicOpen = true;
    component.complexivoOpen = true;

    routerEvents$.next(new NavigationEnd(3, '/estudiante/otro', '/estudiante/otro'));
    expect(component.uicOpen).toBeFalse();
    expect(component.complexivoOpen).toBeFalse();
  });

  it('should handle URL without urlAfterRedirects', () => {
    component.uicOpen = true;
    component.complexivoOpen = true;

    routerEvents$.next(new NavigationEnd(4, '/estudiante/cronograma-uic', ''));
    expect(component.uicOpen).toBeTrue();
    expect(component.complexivoOpen).toBeFalse();
  });

  it('should toggle UI elements correctly', () => {
    component.toggleProfile();
    expect(component.isProfileOpen).toBeTrue();

    component.toggleUIC();
    expect(component.uicOpen).toBeTrue();

    component.toggleComplexivo();
    expect(component.complexivoOpen).toBeTrue();

    component.logout();
    expect(component.isProfileOpen).toBeFalse();
    expect(authMock.logout).toHaveBeenCalled();
  });

  it('should change period correctly', () => {
    component.onChangePeriod('2024-2');
    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2024-2');
  });

  it('should map role names correctly through pickDisplayRole', () => {
    expect((component as any).pickDisplayRole(['Administrador'])).toBe('Administrador');
    expect((component as any).pickDisplayRole(['Estudiante'])).toBe('Estudiante');
    expect((component as any).pickDisplayRole(['Tesoreria'])).toBe('Tesorería');
    expect((component as any).pickDisplayRole(['Secretaria'])).toBe('Secretaría');
    expect((component as any).pickDisplayRole(['Coordinador'])).toBe('Coordinador');
    expect((component as any).pickDisplayRole(['Docente'])).toBe('Docente');
    expect((component as any).pickDisplayRole(['Vicerrector'])).toBe('Vicerrector');
    expect((component as any).pickDisplayRole(['Ingles'])).toBe('Inglés');
    expect((component as any).pickDisplayRole(['Vinculacion_Practicas'])).toBe('Vinculación/Prácticas');

    // Roles en inglés
    expect((component as any).pickDisplayRole(['student'])).toBe('Estudiante');
    expect((component as any).pickDisplayRole(['coordinator'])).toBe('Coordinador');
    expect((component as any).pickDisplayRole(['teacher'])).toBe('Docente');
    expect((component as any).pickDisplayRole(['treasury'])).toBe('Tesorería');
    expect((component as any).pickDisplayRole(['secretary'])).toBe('Secretaría');

    // Rol desconocido
    expect((component as any).pickDisplayRole(['unknown'])).toBe('Usuario');

    // Sin roles
    expect((component as any).pickDisplayRole(undefined)).toBe('Usuario');
    expect((component as any).pickDisplayRole([])).toBe('Usuario');
  });

  it('should synchronize periods correctly', () => {
    periodMock.getActivePeriod.and.returnValue('2024-0');
    activePeriod$ = new BehaviorSubject<any>('2024-0');
    periodMock.activePeriod$ = activePeriod$.asObservable();

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(component2.activePeriod).toBe('2024-0');
    activePeriod$.next('2024-2');
    expect(component2.activePeriod).toBe('2024-2');
  });

  it('should populate periodOptions from listAll', () => {
    expect(component.periodOptions).toEqual(['2024-1', '2024-2']);
  });

  it('should handle profile sync when periodSvc has no active period', () => {
    periodMock.getActivePeriod.and.returnValue('');

    meMock.getProfile.and.returnValue(
      of({ user: { firstname: 'John', lastname: 'Doe' }, activePeriod: { name: '2025-1' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2025-1');
  });

  it('should handle profile sync with empty user and activePeriod name', () => {
    periodMock.getActivePeriod.and.returnValue('');

    meMock.getProfile.and.returnValue(
      of({ user: null, activePeriod: { name: '2025-2' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2025-2');
  });

  it('should handle profile sync with empty user and no activePeriod name', () => {
    periodMock.getActivePeriod.and.returnValue('');

    meMock.getProfile.and.returnValue(
      of({ user: null, activePeriod: { name: '' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(periodMock.setActivePeriod).not.toHaveBeenCalled();
  });

  it('should handle profile sync with empty fullname', () => {
    periodMock.getActivePeriod.and.returnValue('');

    meMock.getProfile.and.returnValue(
      of({ user: { firstname: '', lastname: '' }, activePeriod: { name: '2025-3' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2025-3');
  });

  it('should cover all remaining branches and functions', () => {
    // Forzar el caso donde pickDisplayRole recibe undefined
    // @ts-ignore
    const role1 = component['pickDisplayRole'](undefined);
    expect(role1).toBe('Usuario');

    // Forzar el caso donde pickDisplayRole recibe array vacío
    // @ts-ignore
    const role2 = component['pickDisplayRole']([]);
    expect(role2).toBe('Usuario');

    // Forzar el caso donde mapRoleName recibe un rol no mapeado
    // @ts-ignore
    const role3 = component['mapRoleName']('RolNoExistente');
    expect(role3).toBe('Usuario');

    // Probar todos los casos del switch en mapRoleName
    // @ts-ignore
    expect(component['mapRoleName']('Administrador')).toBe('Administrador');
    // @ts-ignore
    expect(component['mapRoleName']('Estudiante')).toBe('Estudiante');
    // @ts-ignore
    expect(component['mapRoleName']('Tesoreria')).toBe('Tesorería');
    // @ts-ignore
    expect(component['mapRoleName']('Secretaria')).toBe('Secretaría');
    // @ts-ignore
    expect(component['mapRoleName']('Coordinador')).toBe('Coordinador');
    // @ts-ignore
    expect(component['mapRoleName']('Docente')).toBe('Docente');
    // @ts-ignore
    expect(component['mapRoleName']('Vicerrector')).toBe('Vicerrector');
    // @ts-ignore
    expect(component['mapRoleName']('Ingles')).toBe('Inglés');
    // @ts-ignore
    expect(component['mapRoleName']('Vinculacion_Practicas')).toBe('Vinculación/Prácticas');
    // @ts-ignore
    expect(component['mapRoleName']('student')).toBe('Estudiante');
    // @ts-ignore
    expect(component['mapRoleName']('coordinator')).toBe('Coordinador');
    // @ts-ignore
    expect(component['mapRoleName']('teacher')).toBe('Docente');
    // @ts-ignore
    expect(component['mapRoleName']('treasury')).toBe('Tesorería');
    // @ts-ignore
    expect(component['mapRoleName']('secretary')).toBe('Secretaría');
  });

  it('should cover periodListLoading$ and periodOptions with null list', () => {
    // Forzar que listAll devuelva null
    periodMock.listAll.and.returnValue(of(null));

    // Recrear el componente con los nuevos mocks
    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    // Acceder a periodListLoading$
    expect(component2.periodListLoading$).toBeDefined();
    expect(component2.periodOptions).toEqual([]);

    // Verificar que el default del switch en mapRoleName se ejecute
    // @ts-ignore
    expect(component2['mapRoleName']('RolNoExistente')).toBe('Usuario');
  });

  it('should cover the branch where periodSvc.getActivePeriod() is null and ap.name exists', () => {
    periodMock.getActivePeriod.and.returnValue(null);

    meMock.getProfile.and.returnValue(
      of({ user: { firstname: 'John', lastname: 'Doe' }, activePeriod: { name: '2025-1' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(periodMock.setActivePeriod).toHaveBeenCalledWith('2025-1');
  });

  it('should cover the branch where periodSvc.getActivePeriod() returns value and ap.name exists', () => {
    // Forzar que getActivePeriod devuelva un valor
    periodMock.getActivePeriod.and.returnValue('2024-1');

    // Forzar que el perfil tenga un activePeriod con nombre
    meMock.getProfile.and.returnValue(
      of({ user: { firstname: 'John', lastname: 'Doe' }, activePeriod: { name: '2025-1' } })
    );

    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    // En este caso, setActivePeriod NO debería llamarse, porque getActivePeriod ya tiene valor
    expect(periodMock.setActivePeriod).not.toHaveBeenCalled();
  });

  it('should handle the case where currentUserValue is null but currentUser$ emits a value later', () => {
    // Forzar que currentUserValue sea null
    authMock.currentUserValue = null;

    // Recrear el componente con los nuevos mocks
    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    // Verificar que userName y userRole sean 'Estudiante' y 'Estudiante'
    expect(component2.userName).toBe('Estudiante');
    expect(component2.userRole).toBe('Estudiante');

    // Simular que currentUser$ emite un nuevo valor
    currentUser$.next({ name: 'John Doe', roles: ['Estudiante'] });

    // Verificar que userName y userRole se actualicen correctamente
    expect(component2.userName).toBe('John Doe');
    expect(component2.userRole).toBe('Estudiante');
  });

  it('should use default name when user exists but name is empty or undefined', () => {
    // Forzar que currentUserValue tenga roles pero nombre vacío
    authMock.currentUserValue = { roles: ['Estudiante'] };

    // Recrear el componente con los nuevos mocks
    const fixture2 = TestBed.createComponent(EstudianteLayout);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    // Verificar que userName sea 'Estudiante'
    expect(component2.userName).toBe('Estudiante');
    expect(component2.userRole).toBe('Estudiante');

    // Simular que currentUser$ emite un nuevo valor con nombre vacío
    currentUser$.next({ name: '', roles: ['Docente'] });

    // Verificar que userName siga siendo 'Estudiante'
    expect(component2.userName).toBe('Estudiante');
    expect(component2.userRole).toBe('Docente');

    // Simular que currentUser$ emite un nuevo valor sin nombre
    currentUser$.next({ roles: ['Administrador'] });

    // Verificar que userName siga siendo 'Estudiante'
    expect(component2.userName).toBe('Estudiante');
    expect(component2.userRole).toBe('Administrador');
  });
});