import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { Calificacion } from './calificacion';
import { AuthService } from '../../../../services/auth.service';

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

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    createWithUser({ roles: [] });
    expect(component).toBeTruthy();
  });

  it('should load eligible list when allowed (Administrador)', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([
      { id_user: 10, fullname: 'E1', score: 90, status: 'validated' },
      { id_user: 11, fullname: 'E2', score: null, status: 'saved' },
    ]);
    expect(component.items.length).toBe(2);
    expect(component.items[0].guardado).toBeTrue();
    expect(component.items[1].guardado).toBeTrue();
  });

  it('should load eligible list when allowed (Vinculacion_Practicas)', () => {
    createWithUser({ roles: ['Vinculacion_Practicas'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([{ id_user: 10, fullname: 'E1', score: 80, status: null }]);
    expect(component.items.length).toBe(1);
  });

  it('should handle eligible response when backend returns non-array', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush({});
    expect(component.items).toEqual([]);
  });

  it('guardar should do nothing when item not found or nota is not number', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([]);

    spyOn(window, 'alert');
    component.items = [];
    component.guardar(1);
    expect(window.alert).not.toHaveBeenCalled();

    component.items = [{ id: 1, estudiante: 'E', carrera: '', nota: null, guardado: false }];
    component.guardar(1);
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('guardar should post save-for and set guardado on success and alert on error', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([{ id_user: 10, fullname: 'E1', score: 80, status: null }]);

    spyOn(window, 'alert');
    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: 95, guardado: false }];
    component.guardar(10);
    const okReq = httpMock.expectOne('/api/vinculacion/save-for');
    expect(okReq.request.body).toEqual({ target_user_id: 10, score: 95 });
    okReq.flush({});
    expect(component.items[0].guardado).toBeTrue();
    expect(window.alert).toHaveBeenCalled();

    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: 96, guardado: false }];
    component.guardar(10);
    const errReq = httpMock.expectOne('/api/vinculacion/save-for');
    errReq.flush('X', { status: 500, statusText: 'Server Error' });
    expect(window.alert).toHaveBeenCalled();
  });

  it('generarCertificado should cover blob/null/501/other branches', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([{ id_user: 10, fullname: 'E1', score: 80, status: null }]);

    component.items = [{ id: 10, estudiante: 'E1', carrera: '', nota: 80, guardado: true }];
    const http = (component as any).http;
    spyOn(http, 'post').and.returnValues(
      of({ body: new Blob(['x']) } as any),
      of({ body: null } as any),
      throwError(() => ({ status: 501 })),
      throwError(() => ({ status: 500 })),
    );

    spyOn(window, 'alert');
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    spyOn(window, 'open');
    spyOn(window, 'setTimeout').and.callFake(((fn: any) => { fn(); return 0 as any; }) as any);

    component.generarCertificado(10);
    component.generarCertificado(10);
    component.generarCertificado(10);
    component.generarCertificado(10);

    expect(window.alert).toHaveBeenCalled();
  });

  it('generarCertificado should return early when item is not found', () => {
    createWithUser({ roles: ['Administrador'] });
    httpMock.expectOne('/api/vinculacion/eligible').flush([]);
    component.items = [];
    component.generarCertificado(1);
    httpMock.match('/api/vinculacion/certificate').forEach(r => r.flush(new Blob(['x'])));
    expect(component.items).toEqual([]);
  });
});
