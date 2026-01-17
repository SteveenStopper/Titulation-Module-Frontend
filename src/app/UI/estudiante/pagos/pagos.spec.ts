import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { Pagos } from './pagos';
import { VouchersService } from '../../../services/vouchers.service';
import { AuthService } from '../../../services/auth.service';
import { MeService } from '../../../services/me.service';

describe('Pagos', () => {
  let component: Pagos;
  let fixture: ComponentFixture<Pagos>;

  let toastrMock: any;
  let vouchersMock: any;
  let authMock: any;
  let meMock: any;

  function createFile(name: string, type: string, size: number) {
    const blob = new Blob([new ArrayBuffer(size)], { type });
    return new File([blob], name, { type });
  }

  function createComponent() {
    fixture = TestBed.createComponent(Pagos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    toastrMock = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
    };

    vouchersMock = {
      list: jasmine.createSpy('list').and.returnValue(of([])),
      create: jasmine.createSpy('create').and.returnValue(of({})),
      download: jasmine.createSpy('download').and.returnValue(of(new Blob(['x'], { type: 'application/pdf' }))),
      remove: jasmine.createSpy('remove').and.returnValue(of({})),
    };

    authMock = { currentUserValue: { id_user: 1 } };

    meMock = {
      getProfile: jasmine
        .createSpy('getProfile')
        .and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'approved' } } })),
    };

    await TestBed.configureTestingModule({
      imports: [Pagos],
      providers: [
        { provide: ToastrService, useValue: toastrMock },
        { provide: VouchersService, useValue: vouchersMock },
        { provide: AuthService, useValue: authMock },
        { provide: MeService, useValue: meMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set canProceed true when validations approved and load historial', () => {
    createComponent();
    expect(component.validationsLoading).toBeFalse();
    component.ngOnInit();
    // `of(...)` completes synchronously; validationsLoading is flipped back to false on complete
    expect(component.validationsLoading).toBeFalse();
    expect(component.canProceed).toBeTrue();
    expect(component.validationsMsg).toBe('');
    expect(vouchersMock.list).toHaveBeenCalled();
    expect(component.validationsLoading).toBeFalse();
  });

  it('ngOnInit should set canProceed false when validations not approved', () => {
    meMock.getProfile.and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'pending' } } }));
    createComponent();
    component.ngOnInit();
    expect(component.canProceed).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');
  });

  it('ngOnInit should handle validations error', () => {
    meMock.getProfile.and.returnValue(
      new Subject<any>().asObservable()
    );
    createComponent();
    component.ngOnInit();
    expect(component.validationsLoading).toBeTrue();

    const subj = new Subject<any>();
    meMock.getProfile.and.returnValue(subj.asObservable());
    component.ngOnInit();
    subj.error(new Error('X'));
    expect(component.validationsLoading).toBeFalse();
    expect(component.canProceed).toBeFalse();
    expect(component.validationsMsg).toContain('No se pudo verificar');
  });

  it('loadHistorial should early return when id_user missing', () => {
    authMock.currentUserValue = null;
    createComponent();
    component.loadHistorial();
    expect(vouchersMock.list).not.toHaveBeenCalled();
  });

  it('loadHistorial should map and filter allowed voucher types (data array / direct array)', () => {
    vouchersMock.list.and.returnValue(
      of({
        data: [
          { id_voucher: 1, voucher_type: 'pago_titulacion', amount: 10, reference: 'R', created_at: '2024-01-01T00:00:00Z', status: 'aprobado' },
          { id: 2, v_type: 'PAGO_CERTIFICADO', monto: 20, referencia: 'R2', fecha: '2024-01-02T00:00:00Z', estado: 'rechazado' },
          { voucher_id: 3, tipo: 'otro', monto: 30 },
        ],
      })
    );

    createComponent();
    component.loadHistorial();
    expect(component.items.length).toBe(2);
    expect(component.items.map(x => x.id_voucher)).toEqual([1, 2]);
    expect(component.items[1].voucher_type.toLowerCase()).toBe('pago_certificado');

    vouchersMock.list.calls.reset();
    vouchersMock.list.and.returnValue(
      of([
        { id_voucher: 10, voucher_type: 'pago_acta_grado', amount: 5 },
        { id_voucher: 11, voucher_type: 'otro', amount: 6 },
      ])
    );
    component.loadHistorial();
    expect(component.items.map(x => x.id_voucher)).toEqual([10]);
  });

  it('loadHistorial should set items empty when response is not array-like', () => {
    vouchersMock.list.and.returnValue(of({}));
    createComponent();
    component.loadHistorial();
    expect(component.items).toEqual([]);
  });

  it('loadHistorial should handle list error and complete toggling loading', () => {
    vouchersMock.list.and.returnValue(
      new Subject<any>().asObservable()
    );
    createComponent();
    component.loading = false;

    const subj = new Subject<any>();
    vouchersMock.list.and.returnValue(subj.asObservable());
    component.loadHistorial();
    expect(component.loading).toBeTrue();
    subj.error(new Error('X'));
    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('onPagoFile should set file and name (and clear when none)', () => {
    createComponent();
    const f = createFile('a.pdf', 'application/pdf', 10);
    component.onPagoFile({ target: { files: [f] } } as any);
    expect(component.pagoArchivo?.name).toBe('a.pdf');
    expect(component.pagoArchivoNombre).toBe('a.pdf');

    component.onPagoFile({ target: { files: [] } } as any);
    expect(component.pagoArchivo).toBeNull();
    expect(component.pagoArchivoNombre).toBe('');
  });

  it('submitPago should block when canProceed is false', () => {
    createComponent();
    component.canProceed = false;
    component.validationsMsg = 'X';
    component.submitPago();
    expect(toastrMock.warning).toHaveBeenCalledWith('X');
  });

  it('submitPago should use fallback warning message when canProceed is false and validationsMsg empty', () => {
    createComponent();
    component.canProceed = false;
    component.validationsMsg = '';
    component.submitPago();
    expect(toastrMock.warning).toHaveBeenCalledWith('No puedes continuar aún.');
  });

  it('submitPago should validate required fields and file type/size', () => {
    createComponent();
    component.canProceed = true;

    component.submitPago();
    expect(toastrMock.warning).toHaveBeenCalled();

    component.pago = { tipo: 'titulacion', referencia: 'R', monto: 1 } as any;
    component.pagoArchivo = createFile('a.txt', 'text/plain', 10);
    component.submitPago();
    expect(toastrMock.error).toHaveBeenCalled();

    toastrMock.error.calls.reset();
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 20 * 1024 * 1024 + 1);
    component.submitPago();
    expect(toastrMock.error).toHaveBeenCalled();
  });

  it('submitPago should warn when monto is negative', () => {
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'titulacion', referencia: 'R', monto: -1 } as any;
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 10);
    component.submitPago();
    expect(toastrMock.warning).toHaveBeenCalledWith('Completa todos los campos y adjunta el comprobante');
  });

  it('submitPago should error when extension allowed but mime not allowed', () => {
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'titulacion', referencia: 'R', monto: 1 } as any;
    component.pagoArchivo = createFile('a.pdf', 'text/plain', 10);
    component.submitPago();
    expect(toastrMock.error).toHaveBeenCalledWith('Solo se permiten PDF o imágenes (png, jpg, jpeg)');
  });

  it('submitPago should error when session missing', () => {
    authMock.currentUserValue = null;
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'titulacion', referencia: 'R', monto: 1 } as any;
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 10);
    component.submitPago();
    expect(toastrMock.error).toHaveBeenCalledWith('Sesión inválida');
  });

  it('submitPago should map type, call create, reset state and reload historial on success', () => {
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'certificados', referencia: 'R', monto: 10 } as any;
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 10);
    component.pagoArchivoNombre = 'a.pdf';
    component.voucherFile = { nativeElement: { value: 'x' } } as any;

    vouchersMock.list.calls.reset();
    component.submitPago();

    expect(vouchersMock.create).toHaveBeenCalled();
    const args = vouchersMock.create.calls.mostRecent().args;
    expect(args[1].v_type).toBe('pago_certificado');
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component.pagoEstado).toBe('enviado');
    expect(component.pagoArchivo).toBeNull();
    expect(component.pagoArchivoNombre).toBe('');
    expect((component.voucherFile as any).nativeElement.value).toBe('');
    expect(component.pago.tipo).toBe('');
    expect(vouchersMock.list).toHaveBeenCalled();
  });

  it('submitPago should cover other mapTipo branches and tolerate missing voucherFile.nativeElement', () => {
    createComponent();
    component.canProceed = true;
    component.voucherFile = undefined as any;

    component.pago = { tipo: 'titulacion', referencia: 'R', monto: 10 } as any;
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 10);
    component.submitPago();
    expect(vouchersMock.create.calls.mostRecent().args[1].v_type).toBe('pago_titulacion');

    component.pago = { tipo: 'acta_grado', referencia: 'R', monto: 10 } as any;
    component.pagoArchivo = createFile('a.pdf', 'application/pdf', 10);
    component.submitPago();
    expect(vouchersMock.create.calls.mostRecent().args[1].v_type).toBe('pago_acta_grado');
  });

  it('submitPago should use fallback error message when backend has no message', () => {
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'otro', referencia: 'R', monto: 10 } as any;
    component.pagoArchivo = createFile('a.jpg', 'image/jpeg', 10);

    const subj = new Subject<any>();
    vouchersMock.create.and.returnValue(subj.asObservable());
    component.submitPago();
    subj.error({});
    expect(toastrMock.error).toHaveBeenCalledWith('No se pudo enviar el comprobante');
  });

  it('submitPago should show error message from backend', () => {
    createComponent();
    component.canProceed = true;
    component.pago = { tipo: 'otro', referencia: 'R', monto: 10 } as any;
    component.pagoArchivo = createFile('a.jpg', 'image/jpeg', 10);
    vouchersMock.create.and.returnValue(
      new Subject<any>().asObservable()
    );
    const subj = new Subject<any>();
    vouchersMock.create.and.returnValue(subj.asObservable());
    component.submitPago();
    subj.error({ error: { message: 'MSG' } });
    expect(toastrMock.error).toHaveBeenCalledWith('MSG');
  });

  it('descargar should early return without id and handle success/error', () => {
    createComponent();
    component.descargar({});
    expect(vouchersMock.download).not.toHaveBeenCalled();

    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);

    component.descargar({ id_voucher: 1, filename: 'f.pdf' });
    expect(vouchersMock.download).toHaveBeenCalledWith(1);
    expect(a.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();

    vouchersMock.download.and.returnValue(new Subject<any>().asObservable());
    const subj = new Subject<any>();
    vouchersMock.download.and.returnValue(subj.asObservable());
    component.descargar({ id_voucher: 2, filename: 'x' });
    subj.error(new Error('X'));
    expect(toastrMock.error).toHaveBeenCalledWith('No se pudo descargar el comprobante');
  });

  it('descargar should use id from voucher_id and filename fallback', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);

    component.descargar({ voucher_id: '5' });
    expect(vouchersMock.download).toHaveBeenCalledWith(5);
    expect(a.click).toHaveBeenCalled();
    expect(a.download).toBe('comprobante');
  });

  it('descargar should use id from item.id as fallback', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);

    component.descargar({ id: '7', filename: 'x.pdf' });
    expect(vouchersMock.download).toHaveBeenCalledWith(7);
    expect(a.download).toBe('x.pdf');
  });

  it('eliminar should gate by canProceed, handle id missing, confirm cancel, success and error', () => {
    createComponent();

    component.canProceed = false;
    component.validationsMsg = 'X';
    component.eliminar({ id_voucher: 1 });
    expect(toastrMock.warning).toHaveBeenCalledWith('X');

    component.canProceed = true;
    component.eliminar({});
    expect(vouchersMock.remove).not.toHaveBeenCalled();

    spyOn(window, 'confirm').and.returnValue(false);
    component.eliminar({ id_voucher: 1 });
    expect(vouchersMock.remove).not.toHaveBeenCalled();

    (window.confirm as any).and.returnValue(true);
    component.items = [
      { id_voucher: 1, voucher_type: 'pago_titulacion' },
      { id_voucher: 2, voucher_type: 'pago_certificado' },
    ];
    component.eliminar({ id_voucher: 1 });
    expect(vouchersMock.remove).toHaveBeenCalledWith(1);
    expect(toastrMock.success).toHaveBeenCalled();
    expect(component.items.map(x => x.id_voucher)).toEqual([2]);

    vouchersMock.remove.and.returnValue(new Subject<any>().asObservable());
    const subj = new Subject<any>();
    vouchersMock.remove.and.returnValue(subj.asObservable());
    component.eliminar({ id_voucher: 2 });
    subj.error(new Error('X'));
    expect(toastrMock.error).toHaveBeenCalledWith('No se pudo eliminar el comprobante');
  });

  it('eliminar should use fallback warning message when canProceed is false and validationsMsg empty', () => {
    createComponent();
    component.canProceed = false;
    component.validationsMsg = '';
    component.eliminar({ id_voucher: 1 });
    expect(toastrMock.warning).toHaveBeenCalledWith('No puedes continuar aún.');
  });

  it('eliminar should use id from item.id as fallback', () => {
    createComponent();
    component.canProceed = true;
    spyOn(window, 'confirm').and.returnValue(true);
    component.items = [{ id: 1 }, { id: 2 }];
    component.eliminar({ id: '1' });
    expect(vouchersMock.remove).toHaveBeenCalledWith(1);
  });

  it('loadHistorial should map alternative fields for reference/status/observation', () => {
    vouchersMock.list.and.returnValue(
      of([
        { id: 1, v_type: 'pago_titulacion', referencia: 'R', estado: 'aprobado', observacion: 'OK', fecha: '2024-01-01T00:00:00Z' },
      ])
    );
    createComponent();
    component.loadHistorial();
    expect(component.items.length).toBe(1);
    expect(component.items[0].reference).toBe('R');
    expect(component.items[0].status).toBe('aprobado');
    expect(component.items[0].observation).toBe('OK');
  });

  it('labelTipo and labelEstado should map values', () => {
    createComponent();
    expect(component.labelTipo('pago_titulacion')).toBe('Titulación');
    expect(component.labelTipo('pago_certificado')).toBe('Certificados');
    expect(component.labelTipo('pago_acta_grado')).toBe('Acta de Grado');
    expect(component.labelTipo('x')).toBe('Otro');

    expect(component.labelEstado('aprobado')).toBe('Aprobado');
    expect(component.labelEstado('rechazado')).toBe('Rechazado');
    expect(component.labelEstado('pendiente')).toBe('En revisión');
  });
});
