import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { Calificacion } from './calificacion';
import { AuthService } from '../../../services/auth.service';

describe('Calificacion', () => {
  let component: Calificacion;
  let fixture: ComponentFixture<Calificacion>;
  let httpMock: HttpTestingController;
  let authMock: { currentUserValue: any };

  function createWithUser(user: any) {
    authMock.currentUserValue = user;
    fixture = TestBed.createComponent(Calificacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    authMock = { currentUserValue: { roles: [] } };

    await TestBed.configureTestingModule({
      imports: [Calificacion, HttpClientTestingModule],
      providers: [
        {
          provide: AuthService,
          useValue: authMock,
        },
      ],
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  it('guardar should not overwrite id when response id is not a number', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 7, score: 70, status: 'new' });

    spyOn(window, 'alert');
    component.items = [{ id: 7, estudiante: 'Juan Perez', carrera: '', nota: 75, guardado: false }];
    component.guardar(7);

    const req = httpMock.expectOne('/api/english/save');
    req.flush({ id: 'x' });
    expect(component.items[0].guardado).toBeTrue();
    expect(component.items[0].id).toBe(7);
  });

  it('guardar should not overwrite id when response is null', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 7, score: 70, status: 'new' });

    spyOn(window, 'alert');
    component.items = [{ id: 7, estudiante: 'Juan Perez', carrera: '', nota: 75, guardado: false }];
    component.guardar(7);

    const req = httpMock.expectOne('/api/english/save');
    req.flush(null);
    expect(component.items[0].guardado).toBeTrue();
    expect(component.items[0].id).toBe(7);
  });

  it('guardar should select first item when called with id=0', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 7, score: 70, status: 'new' });

    spyOn(window, 'alert');
    component.items = [{ id: 7, estudiante: 'Juan Perez', carrera: '', nota: 75, guardado: false }];
    component.guardar(0);
    httpMock.expectOne('/api/english/save').flush({ id: 7 });
    expect(component.items[0].guardado).toBeTrue();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    createWithUser({ roles: [], firstname: 'A', lastname: 'B' });
    httpMock.expectOne('/api/english/my').flush({ id: 1, score: 70, status: 'saved' });
    expect(component).toBeTruthy();
  });

  it('should use default name when user is null and fallback item when /my fails', () => {
    createWithUser(null);
    httpMock.expectOne('/api/english/my').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.items.length).toBe(1);
    expect(component.items[0].estudiante).toBe('Yo');
    expect(component.items[0].guardado).toBeFalse();
  });

  it('should treat roles as missing (not admin) when roles is undefined', () => {
    createWithUser({ firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 1, score: 70, status: 'new' });
    expect(component.items.length).toBe(1);
    expect(component.items[0].guardado).toBeFalse();
  });

  it('should handle /my returning null data object', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush(null);
    expect(component.items.length).toBe(1);
    expect(component.items[0].id).toBe(0);
    expect(component.items[0].nota).toBeNull();
    expect(component.items[0].guardado).toBeFalse();
  });

  it('should load eligible list when adminIngles is true', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([
      { id_user: 10, fullname: 'E1', score: 90, status: 'validated' },
      { id_user: 11, fullname: 'E2', score: null, status: null },
    ]);
    expect(component.items.length).toBe(2);
    expect(component.items[0].guardado).toBeTrue();
    expect(component.isNotaLista(component.items[0])).toBeTrue();
    expect(component.isNotaLista(component.items[1])).toBeFalse();
  });

  it('should treat role Ingles as adminIngles (eligible list path)', () => {
    createWithUser({ roles: ['Ingles'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: 80, status: null }]);
    expect(component.items.length).toBe(1);
    expect(component.items[0].estudiante).toBe('E1');
  });

  it('should mark guardado=true when eligible status is saved', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([
      { id_user: 10, fullname: 'E1', score: 80, status: 'saved' },
    ]);
    expect(component.items.length).toBe(1);
    expect(component.items[0].guardado).toBeTrue();
  });

  it('should handle eligible response when backend returns non-array', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush({});
    expect(component.items).toEqual([]);
  });

  it('should load my score for normal user and fallback on error', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 7, score: 80, status: 'validated' });
    expect(component.items.length).toBe(1);
    expect(component.items[0].nota).toBe(80);
    expect(component.items[0].guardado).toBeTrue();

    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 7, score: '80', status: 'saved' });
    expect(component.items.length).toBe(1);
    expect(component.items[0].nota).toBeNull();
    expect(component.items[0].guardado).toBeTrue();

    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush('X', { status: 500, statusText: 'Server Error' });
    expect(component.items.length).toBe(1);
    expect(component.items[0].nota).toBeNull();
    expect(component.items[0].guardado).toBeFalse();
  });

  it('guardar should do nothing when item not found or nota is not number', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 1, score: null, status: 'new' });

    spyOn(window, 'alert');
    component.items = [];
    component.guardar(123);
    expect(window.alert).not.toHaveBeenCalled();

    component.items = [{ id: 1, estudiante: 'X', carrera: '', nota: null, guardado: false }];
    component.guardar(1);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('guardar should post /save for normal user and set guardado and id on success', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 0, score: 70, status: 'new' });

    spyOn(window, 'alert');
    component.items = [{ id: 0, estudiante: 'Juan Perez', carrera: '', nota: 75, guardado: false }];
    component.guardar(0);

    const req = httpMock.expectOne('/api/english/save');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ score: 75 });
    req.flush({ id: 99 });

    expect(component.items[0].guardado).toBeTrue();
    expect(component.items[0].id).toBe(99);
    expect(window.alert).toHaveBeenCalled();
  });

  it('lookupTargetUserIdByNombre should return null when stored id is not finite', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: 90, status: null }]);

    (component as any)._reverseEligibleMap.set('Bad', NaN);
    expect((component as any).lookupTargetUserIdByNombre('Bad')).toBeNull();
  });

  it('guardar should alert when lookup returns 0 (finite but falsy)', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: 90, status: null }]);

    (component as any)._reverseEligibleMap.set('Zero', 0);
    spyOn(window, 'alert');
    component.items = [{ id: 10, estudiante: 'Zero', carrera: '', nota: 90, guardado: false }];
    component.guardar(10);
    expect(window.alert).toHaveBeenCalled();
  });

  it('guardar should alert on /save error for normal user', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 0, score: 70, status: 'new' });

    spyOn(window, 'alert');
    component.items = [{ id: 0, estudiante: 'Juan Perez', carrera: '', nota: 75, guardado: false }];
    component.guardar(0);

    const req = httpMock.expectOne('/api/english/save');
    req.flush('X', { status: 500, statusText: 'Server Error' });
    expect(window.alert).toHaveBeenCalled();
  });

  it('guardar should post /save-for in admin mode and handle missing target', () => {
    createWithUser({ roles: ['Ingles'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: 90, status: null }]);

    spyOn(window, 'alert');
    component.items = [{ id: 10, estudiante: 'NO_EXISTE', carrera: '', nota: 90, guardado: false }];
    component.guardar(10);
    expect(window.alert).toHaveBeenCalled();
  });

  it('guardar should post /save-for in admin mode on success and error', () => {
    createWithUser({ roles: ['Administrador'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: 90, status: null }]);

    spyOn(window, 'alert');
    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: 95, guardado: false }];
    component.guardar(10);

    const okReq = httpMock.expectOne('/api/english/save-for');
    expect(okReq.request.method).toBe('POST');
    expect(okReq.request.body).toEqual({ target_user_id: 10, score: 95 });
    okReq.flush({});
    expect(component.items[0].guardado).toBeTrue();

    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: 96, guardado: false }];
    component.guardar(10);
    const errReq = httpMock.expectOne('/api/english/save-for');
    errReq.flush('X', { status: 500, statusText: 'Server Error' });
    expect(window.alert).toHaveBeenCalled();
  });

  it('guardar should return early in admin mode when nota is not number', () => {
    createWithUser({ roles: ['Ingles'], firstname: 'Admin', lastname: 'X' });
    httpMock.expectOne('/api/english/eligible').flush([{ id_user: 10, fullname: 'E1', score: null, status: null }]);

    spyOn(window, 'alert');
    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: null, guardado: false }];
    component.guardar(10);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('generarCertificado should return early when item is not found', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 1, score: 70, status: 'validated' });
    component.items = [];
    component.generarCertificado(1);
    httpMock.match('/api/english/certificate').forEach(r => r.flush(new Blob(['x'])));
    expect(component.items).toEqual([]);
  });

  it('generarCertificado should open URL when blob is returned and handle null and errors', () => {
    createWithUser({ roles: [], firstname: 'Juan', lastname: 'Perez' });
    httpMock.expectOne('/api/english/my').flush({ id: 1, score: 70, status: 'validated' });

    spyOn(window, 'alert');
    const createSpy = spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    const revokeSpy = spyOn(window.URL, 'revokeObjectURL');
    spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => {
      fn();
      return 0 as any;
    }) as any);

    const http = (component as any).http;

    spyOn(http, 'post').and.returnValues(
      of({ body: new Blob(['x']) } as any),
      of({ body: null } as any),
      throwError(() => ({ status: 501 })),
      throwError(() => ({ status: 500 })),
    );

    component.items = [{ id: 1, estudiante: 'Juan Perez', carrera: '', nota: 70, guardado: true }];

    component.generarCertificado(1);
    expect(createSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();

    component.generarCertificado(1);
    expect(window.alert).toHaveBeenCalled();

    component.generarCertificado(1);
    expect(window.alert).toHaveBeenCalled();

    component.generarCertificado(1);
    expect(window.alert).toHaveBeenCalled();
  });
});
