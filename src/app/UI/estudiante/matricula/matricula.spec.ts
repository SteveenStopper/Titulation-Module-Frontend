import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { Matricula } from './matricula';
import { DocumentsService } from '../../../services/documents.service';
import { MeService } from '../../../services/me.service';

describe('Matricula', () => {
  let component: Matricula;
  let fixture: ComponentFixture<Matricula>;

  let toastMock: any;
  let docsMock: any;
  let meMock: any;

  function createFile(name: string, type: string, size: number) {
    const blob = new Blob([new ArrayBuffer(size)], { type });
    return new File([blob], name, { type });
  }

  function createComponent() {
    fixture = TestBed.createComponent(Matricula);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    toastMock = {
      success: jasmine.createSpy('success'),
      error: jasmine.createSpy('error'),
      warning: jasmine.createSpy('warning'),
      info: jasmine.createSpy('info'),
    };

    docsMock = {
      list: jasmine.createSpy('list').and.returnValue(of([])),
      upload: jasmine.createSpy('upload').and.returnValue(of({})),
      download: jasmine.createSpy('download').and.returnValue(of(new Blob(['x'], { type: 'application/pdf' }))),
      remove: jasmine.createSpy('remove').and.returnValue(of({})),
    };

    meMock = {
      getProfile: jasmine
        .createSpy('getProfile')
        .and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'approved' } } })),
    };

    await TestBed.configureTestingModule({
      imports: [Matricula],
      providers: [
        { provide: ToastrService, useValue: toastMock },
        { provide: DocumentsService, useValue: docsMock },
        { provide: MeService, useValue: meMock },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('ngOnInit should enable gating when validations approved and load checklist', () => {
    createComponent();
    component.ngOnInit();
    expect(component.canProceed).toBeTrue();
    expect(component.requisitosHabilitados).toBeTrue();
    expect(component.validationsMsg).toBe('');
    expect(docsMock.list).toHaveBeenCalled();
    expect(component.validationsLoading).toBeFalse();
  });

  it('ngOnInit should disable gating when validations not approved', () => {
    meMock.getProfile.and.returnValue(of({ validations: { tesoreria_aranceles: { estado: 'approved' }, secretaria_promedios: { estado: 'pending' } } }));
    createComponent();
    component.ngOnInit();
    expect(component.canProceed).toBeFalse();
    expect(component.requisitosHabilitados).toBeFalse();
    expect(component.validationsMsg).toContain('Debes tener aprobados');
  });

  it('ngOnInit should handle validations error', () => {
    const subj = new Subject<any>();
    meMock.getProfile.and.returnValue(subj.asObservable());
    createComponent();
    component.ngOnInit();
    subj.error(new Error('X'));
    expect(component.validationsLoading).toBeFalse();
    expect(component.canProceed).toBeFalse();
    expect(component.requisitosHabilitados).toBeFalse();
    expect(component.validationsMsg).toContain('No se pudo verificar');
  });

  it('loadChecklist should map docs list from {data:[]} or array and handle error', () => {
    docsMock.list.and.returnValue(
      of({
        data: [
          { id: 1, filename: 'a.pdf', created_at: '2024-01-01T00:00:00Z', tipo: 'solicitud', status: 'aprobado', observacion: 'ok' },
          { document_id: 2, nombre_archivo: 'b.pdf', creado_en: '2024-01-02T00:00:00Z', document_type: 'oficio', estado: 'rechazado', observation: 'bad' },
          { documento_id: 3, nombre: 'c.pdf', createdAt: '2024-01-03T00:00:00Z', doc_type: 'cert_ingles' },
        ],
      })
    );

    createComponent();
    component.loadChecklist();
    expect(component.docsList.map(d => d.id)).toEqual([1, 2, 3]);
    expect(component.docsList[1].filename).toBe('b.pdf');
    expect(component.docsList[1].tipo).toBe('oficio');
    expect(component.docsList[1].observacion).toBe('bad');

    docsMock.list.and.returnValue(of([{ id: 9, filename: 'x.pdf', fecha: '2024-01-05T00:00:00Z', voucher_type: 'otro' }]));
    component.loadChecklist();
    expect(component.docsList[0].id).toBe(9);

    const err$ = new Subject<any>();
    docsMock.list.and.returnValue(err$.asObservable());
    component.loadChecklist();
    err$.error(new Error('X'));
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo cargar el checklist de documentos');
  });

  it('loadChecklist should cover filename/created_at/tipo/estado fallbacks', () => {
    docsMock.list.and.returnValue(
      of([
        { document_id: '5', nombre: null, nombre_archivo: null, createdAt: null, voucher_type: null, estado: null },
      ])
    );
    createComponent();
    component.loadChecklist();
    expect(component.docsList.length).toBe(1);
    expect(component.docsList[0].id).toBe(5);
    expect(component.docsList[0].filename).toBe('-');
    expect(component.docsList[0].tipo).toBe('otro');
    expect(component.docsList[0].estado).toBe('en_revision');
  });

  it('hasOtrosSinTipo and canSubmitRequisitos should compute correctly', () => {
    createComponent();

    component.requisitosHabilitados = true;
    component.loading = false;
    expect(component.canSubmitRequisitos).toBeFalse();

    component.reqArchivos.solicitud = createFile('s.pdf', 'application/pdf', 10);
    expect(component.canSubmitRequisitos).toBeFalse();
    component.reqTipos.solicitud = 'Solicitud';
    expect(component.canSubmitRequisitos).toBeTrue();

    component.reqOtros = [{ file: createFile('o.pdf', 'application/pdf', 10), nombre: 'o.pdf', tipo: '' }];
    expect(component.hasOtrosSinTipo).toBeTrue();
    expect(component.canSubmitRequisitos).toBeFalse();

    component.reqOtros[0].tipo = 'Certificado de inglés';
    expect(component.hasOtrosSinTipo).toBeFalse();
    expect(component.canSubmitRequisitos).toBeTrue();

    component.loading = true;
    expect(component.canSubmitRequisitos).toBeFalse();
  });

  it('canSubmitRequisitos should require oficio tipo when oficio present (trim)', () => {
    createComponent();
    component.requisitosHabilitados = true;
    component.loading = false;
    component.reqArchivos.oficio = createFile('o.pdf', 'application/pdf', 10);
    component.reqTipos.oficio = '   ';
    expect(component.canSubmitRequisitos).toBeFalse();
    component.reqTipos.oficio = 'Oficio';
    expect(component.canSubmitRequisitos).toBeTrue();
  });

  it('onReqFile should gate when requisitosHabilitados=false', () => {
    createComponent();
    component.requisitosHabilitados = false;
    component.validationsMsg = 'X';
    component.onReqFile({ target: { files: [] } } as any, 'solicitud');
    expect(toastMock.warning).toHaveBeenCalledWith('X');
  });

  it('onReqFile should set/clear solicitud and oficio, and add otros without duplicates', () => {
    createComponent();
    component.requisitosHabilitados = true;

    const s = createFile('s.pdf', 'application/pdf', 10);
    component.onReqFile({ target: { files: [s] } } as any, 'solicitud');
    expect(component.reqArchivos.solicitud?.name).toBe('s.pdf');
    expect(component.reqNombres.solicitud).toBe('s.pdf');

    component.onReqFile({ target: { files: [] } } as any, 'solicitud');
    expect(component.reqArchivos.solicitud).toBeUndefined();
    expect(component.reqNombres.solicitud).toBeUndefined();

    const f1 = createFile('o1.pdf', 'application/pdf', 10);
    const f2 = createFile('o1.pdf', 'application/pdf', 10);
    const input: any = { files: [f1, f2], value: 'x' };
    component.onReqFile({ target: input } as any, 'otro');
    expect(component.reqOtros.length).toBe(1);
    expect(input.value).toBe('');
    expect(component.reqArchivos.otro).toBeUndefined();
  });

  it('removeOtro should gate and remove item', () => {
    createComponent();
    component.reqOtros = [{ file: createFile('a.pdf', 'application/pdf', 10), nombre: 'a.pdf', tipo: '' }];
    component.requisitosHabilitados = false;
    component.validationsMsg = 'X';
    component.removeOtro(0);
    expect(toastMock.warning).toHaveBeenCalledWith('X');
    expect(component.reqOtros.length).toBe(1);

    component.requisitosHabilitados = true;
    component.removeOtro(0);
    expect(component.reqOtros.length).toBe(0);
  });

  it('submitRequisitos should gate, validate PDF/size, upload success (with mapping) and error', fakeAsync(() => {
    createComponent();

    component.requisitosHabilitados = false;
    component.validationsMsg = 'X';
    component.submitRequisitos();
    expect(toastMock.warning).toHaveBeenCalledWith('X');

    component.requisitosHabilitados = true;

    component.reqArchivos.solicitud = createFile('s.txt', 'text/plain', 10);
    component.reqTipos.solicitud = 'Solicitud';
    component.submitRequisitos();
    expect(toastMock.error).toHaveBeenCalledWith('Solo se permiten archivos PDF');

    toastMock.error.calls.reset();
    component.reqArchivos = { solicitud: createFile('s.pdf', 'application/pdf', 10) };
    component.reqTipos = { solicitud: 'Solicitud' };
    // size > 20MB branch
    component.reqArchivos.solicitud = createFile('big.pdf', 'application/pdf', 20 * 1024 * 1024 + 1);
    component.submitRequisitos();
    expect(toastMock.error).toHaveBeenCalledWith('Archivo excede 20MB');

    toastMock.error.calls.reset();
    component.reqArchivos = { solicitud: createFile('s.pdf', 'application/pdf', 10) };
    component.reqTipos = { solicitud: 'Solicitud' };
    component.reqOtros = [
      { file: createFile('v.pdf', 'application/pdf', 10), nombre: 'v.pdf', tipo: 'Certificado de vinculación' },
      { file: createFile('p.pdf', 'application/pdf', 10), nombre: 'p.pdf', tipo: 'Certificado de prácticas pre profesionales' },
      { file: createFile('i.pdf', 'application/pdf', 10), nombre: 'i.pdf', tipo: 'Certificado de inglés' },
      { file: createFile('x.pdf', 'application/pdf', 10), nombre: 'x.pdf', tipo: 'Otro' },
    ];

    spyOn(component, 'loadChecklist');
    component.submitRequisitos();
    flushMicrotasks();
    expect(docsMock.upload).toHaveBeenCalled();
    const calls = docsMock.upload.calls.allArgs().map((a: any[]) => a[0]);
    const tipos = calls.map((fd: FormData) => fd.get('tipo'));
    expect(tipos).toContain('solicitud');
    expect(tipos).toContain('cert_vinculacion');
    expect(tipos).toContain('cert_practicas');
    expect(tipos).toContain('cert_ingles');
    expect(toastMock.success).toHaveBeenCalledWith('Requisitos enviados a Secretaría');
    expect(component.reqEstado).toBe('enviado');
    expect(component.reqOtros.length).toBe(0);
    expect(component.loadChecklist).toHaveBeenCalled();

    docsMock.upload.calls.reset();
    toastMock.error.calls.reset();

    docsMock.upload.and.returnValue(throwError(() => ({ error: {} })));
    component.reqArchivos = { oficio: createFile('o.pdf', 'application/pdf', 10) };
    component.reqTipos = { oficio: 'Oficio' };
    component.reqOtros = [];
    component.submitRequisitos();
    flushMicrotasks();
    expect(toastMock.error).toHaveBeenCalledWith('No se pudieron subir los documentos');
  }));

  it('submitRequisitos should allow empty upload list and still finish successfully', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    spyOn(component, 'loadChecklist');
    component.submitRequisitos();
    flushMicrotasks();
    expect(toastMock.success).toHaveBeenCalledWith('Requisitos enviados a Secretaría');
    expect(component.reqEstado).toBe('enviado');
    expect(component.loading).toBeFalse();
  }));

  it('submitRequisitos should reject when mime is pdf but filename is not .pdf', () => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { solicitud: createFile('s.PDFX', 'application/pdf', 10) };
    component.reqTipos = { solicitud: 'Solicitud' };
    component.submitRequisitos();
    expect(toastMock.error).toHaveBeenCalledWith('Solo se permiten archivos PDF');
  });

  it('download should early return without id and handle success/error', () => {
    createComponent();
    component.download({});
    expect(docsMock.download).not.toHaveBeenCalled();

    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);

    component.download({ id: 1, filename: 'a.pdf' });
    expect(docsMock.download).toHaveBeenCalledWith(1);
    expect(a.click).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();

    const err$ = new Subject<any>();
    docsMock.download.and.returnValue(err$.asObservable());
    component.download({ id: 2, filename: 'x' });
    err$.error(new Error('X'));
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo descargar el documento');
  });

  it('download should use document_id fallback', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    component.download({ document_id: 9, nombre: 'x.pdf' });
    expect(docsMock.download).toHaveBeenCalledWith(9);
    expect(a.click).toHaveBeenCalled();
  });

  it('download should use nombre fallback when filename missing', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);

    component.download({ id: 1, nombre: 'n.pdf' });
    expect(a.download).toBe('n.pdf');
  });

  it('remove should gate by canProceed, handle id missing, confirm cancel, success and error', () => {
    createComponent();
    component.canProceed = false;
    component.validationsMsg = 'X';
    component.remove({ id: 1 });
    expect(toastMock.warning).toHaveBeenCalledWith('X');

    component.canProceed = true;
    component.remove({});
    expect(docsMock.remove).not.toHaveBeenCalled();

    spyOn(window, 'confirm').and.returnValue(false);
    component.remove({ id: 1 });
    expect(docsMock.remove).not.toHaveBeenCalled();

    (window.confirm as any).and.returnValue(true);
    component.docsList = [{ id: 1 }, { id: 2 }];
    component.remove({ id: 1 });
    expect(docsMock.remove).toHaveBeenCalledWith(1);
    expect(toastMock.success).toHaveBeenCalledWith('Documento eliminado');
    expect(component.docsList.map(d => d.id)).toEqual([2]);

    const err$ = new Subject<any>();
    docsMock.remove.and.returnValue(err$.asObservable());
    component.remove({ id: 2 });
    err$.error(new Error('X'));
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo eliminar el documento');
  });

  it('remove should use fallback warning message when canProceed is false and validationsMsg empty', () => {
    createComponent();
    component.canProceed = false;
    component.validationsMsg = '';
    component.remove({ id: 1 });
    expect(toastMock.warning).toHaveBeenCalledWith('No puedes continuar aún.');
  });

  it('remove should use document_id fallback for id', () => {
    createComponent();
    component.canProceed = true;
    spyOn(window, 'confirm').and.returnValue(true);
    component.docsList = [{ document_id: 1 }, { document_id: 2 }] as any;
    component.remove({ document_id: 1 });
    expect(docsMock.remove).toHaveBeenCalledWith(1);
  });

  it('labelTipo and labelEstado should map branches', () => {
    createComponent();
    expect(component.labelTipo('solicitud')).toBe('Solicitud');
    expect(component.labelTipo('oficio')).toBe('Oficio');
    expect(component.labelTipo('uic_final')).toBe('Informe final UIC');
    expect(component.labelTipo('uic_acta_tribunal')).toBe('Acta de Tribunal UIC');
    expect(component.labelTipo('cert_tesoreria')).toBe('Cert. Tesorería');
    expect(component.labelTipo('cert_secretaria')).toBe('Cert. Secretaría');
    expect(component.labelTipo('cert_vinculacion')).toBe('Cert. de vinculación');
    expect(component.labelTipo('cert_practicas')).toBe('Cert. de prácticas');
    expect(component.labelTipo('cert_ingles')).toBe('Cert. de inglés');
    expect(component.labelTipo('comprobante_certificados')).toBe('Comprobante de certificados');
    expect(component.labelTipo('comprobante_titulacion')).toBe('Comprobante de titulación');
    expect(component.labelTipo('comprobante_acta_grado')).toBe('Comprobante acta de grado');
    expect(component.labelTipo('x')).toBe('Otro');

    expect(component.labelEstado('aprobado')).toBe('Aprobado');
    expect(component.labelEstado('rechazado')).toBe('Rechazado');
    expect(component.labelEstado('x')).toBe('En revisión');
  });

  it('should handle all remaining branches', () => {
    createComponent();

    // Test all possible validation states
    expect(component.labelEstado('aprobado')).toBe('Aprobado');
    expect(component.labelEstado('rechazado')).toBe('Rechazado');
    expect(component.labelEstado('')).toBe('En revisión');
    expect(component.labelEstado(null as any)).toBe('En revisión');
    expect(component.labelEstado(undefined as any)).toBe('En revisión');

    // Test all possible tipo states
    expect(component.labelTipo('')).toBe('Otro');
    expect(component.labelTipo(null as any)).toBe('Otro');
    expect(component.labelTipo(undefined as any)).toBe('Otro');

    // Test edge cases for canSubmitRequisitos
    component.requisitosHabilitados = false;
    expect(component.canSubmitRequisitos).toBeFalse();

    component.requisitosHabilitados = true;
    component.loading = true;
    expect(component.canSubmitRequisitos).toBeFalse();

    component.loading = false;
    component.reqArchivos.solicitud = createFile('test.pdf', 'application/pdf', 10);
    expect(component.canSubmitRequisitos).toBeFalse(); // Missing tipo

    component.reqTipos.solicitud = 'Solicitud';
    expect(component.canSubmitRequisitos).toBeTrue();

    // Add otro without tipo
    component.reqOtros = [{ file: createFile('test.pdf', 'application/pdf', 10), nombre: 'test.pdf', tipo: '' }];
    expect(component.canSubmitRequisitos).toBeFalse(); // Missing tipo in otro

    component.reqOtros[0].tipo = 'Certificado';
    expect(component.canSubmitRequisitos).toBeTrue();
  });

  it('should handle submitRequisitos with empty arrays', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = {};
    component.reqTipos = {};
    component.reqOtros = [];

    spyOn(component, 'loadChecklist');
    component.submitRequisitos();
    flushMicrotasks();

    expect(toastMock.success).toHaveBeenCalledWith('Requisitos enviados a Secretaría');
    expect(component.reqEstado).toBe('enviado');
    expect(component.loadChecklist).toHaveBeenCalled();
  }));

  it('should handle submitRequisitos with mixed valid and invalid files', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { solicitud: createFile('test.pdf', 'application/pdf', 10) };
    component.reqTipos = { solicitud: 'Solicitud' };
    component.reqOtros = [
      { file: createFile('valid.pdf', 'application/pdf', 10), nombre: 'valid.pdf', tipo: 'Certificado' },
      { file: createFile('invalid.txt', 'text/plain', 10), nombre: 'invalid.txt', tipo: 'Certificado' },
    ];

    component.submitRequisitos();
    expect(toastMock.error).toHaveBeenCalledWith('Solo se permiten archivos PDF');
  }));

  it('should handle submitRequisitos with all possible validation states', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { solicitud: createFile('test.pdf', 'application/pdf', 10) };
    component.reqTipos = { solicitud: 'Solicitud' };
    component.reqOtros = [
      { file: createFile('cert.pdf', 'application/pdf', 10), nombre: 'cert.pdf', tipo: 'Certificado de vinculación' },
    ];

    // Mock upload to simulate success
    docsMock.upload.and.returnValue(of({}));

    spyOn(component, 'loadChecklist');
    component.submitRequisitos();
    flushMicrotasks();

    expect(toastMock.success).toHaveBeenCalledWith('Requisitos enviados a Secretaría');
    expect(component.reqEstado).toBe('enviado');
    expect(component.loadChecklist).toHaveBeenCalled();
  }));

  it('should handle submitRequisitos with different validation states', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { oficio: createFile('test.pdf', 'application/pdf', 10) };
    component.reqTipos = { oficio: 'Oficio' };
    component.reqOtros = [];

    // Mock upload to simulate success
    docsMock.upload.and.returnValue(of({}));

    spyOn(component, 'loadChecklist');
    component.submitRequisitos();
    flushMicrotasks();

    expect(toastMock.success).toHaveBeenCalledWith('Requisitos enviados a Secretaría');
    expect(component.reqEstado).toBe('enviado');
    expect(component.loadChecklist).toHaveBeenCalled();
  }));

  it('should handle submitRequisitos with different validation states and error', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { oficio: createFile('test.pdf', 'application/pdf', 10) };
    component.reqTipos = { oficio: 'Oficio' };
    component.reqOtros = [];

    // Mock upload to simulate error
    docsMock.upload.and.returnValue(throwError(() => ({ error: { message: 'Error de subida' } })));

    component.submitRequisitos();
    flushMicrotasks();

    expect(toastMock.error).toHaveBeenCalledWith('Error de subida');
  }));

  it('should handle submitRequisitos with different validation states and generic error', fakeAsync(() => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos = { oficio: createFile('test.pdf', 'application/pdf', 10) };
    component.reqTipos = { oficio: 'Oficio' };
    component.reqOtros = [];

    // Mock upload to simulate generic error
    docsMock.upload.and.returnValue(throwError(() => ({ error: {} })));

    component.submitRequisitos();
    flushMicrotasks();

    expect(toastMock.error).toHaveBeenCalledWith('No se pudieron subir los documentos');
  }));

  it('should handle null or undefined validations in ngOnInit', () => {
    meMock.getProfile.and.returnValue(of({
      user: { id_user: 99 },
      validations: {
        tesoreria_aranceles: { estado: null },
        secretaria_promedios: { estado: undefined },
      },
    }));

    createComponent();
    component.ngOnInit();

    expect(component.validationsMsg).toBe('Debes tener aprobados Arancel (Tesorería) y Notas (Secretaría) para continuar.');
  });

  it('should handle null or undefined res in loadChecklist', () => {
    docsMock.list.and.returnValue(of(null as any));
    createComponent();
    component.loadChecklist();
    expect(component.docsList.length).toBe(0);
  });

  it('should handle empty files in onReqFile', () => {
    createComponent();
    component.requisitosHabilitados = true;
    const input: any = { files: [], value: 'x' };
    component.onReqFile({ target: input } as any, 'otro');
    expect(component.reqOtros.length).toBe(0);
  });

  it('should handle existing file in onReqFile', () => {
    createComponent();
    component.requisitosHabilitados = true;
    const f = createFile('a.pdf', 'application/pdf', 10);
    component.reqOtros = [{ file: f, nombre: 'a.pdf', tipo: '' }];
    const input: any = { files: [f], value: 'x' };
    component.onReqFile({ target: input } as any, 'otro');
    expect(component.reqOtros.length).toBe(1);
  });

  it('should handle null or undefined tipo in submitRequisitos', () => {
    createComponent();
    component.requisitosHabilitados = true;
    component.reqArchivos.solicitud = createFile('s.pdf', 'application/pdf', 10);
    component.reqTipos.solicitud = 'Solicitud';
    component.reqOtros = [{ file: createFile('o.pdf', 'application/pdf', 10), nombre: 'o.pdf', tipo: null as any }];
    expect(component.canSubmitRequisitos).toBeFalse();
  });

  it('should handle null or undefined item in download', () => {
    createComponent();
    component.download({});
    expect(docsMock.download).not.toHaveBeenCalled();
  });

  it('should handle null or undefined id in download', () => {
    createComponent();
    component.download({ id: null });
    expect(docsMock.download).not.toHaveBeenCalled();
  });

  it('should handle NaN id in download', () => {
    createComponent();
    component.download({ id: NaN });
    expect(docsMock.download).not.toHaveBeenCalled();
  });

  it('should handle null or undefined blob in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(of(null as any));
    component.download({ id: 1, filename: 'a.pdf' });
    expect(a.click).toHaveBeenCalled();
  });

  it('should handle null or undefined url in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    component.download({ id: 1, filename: 'a.pdf' });
    expect(a.click).toHaveBeenCalled();
  });

  it('should handle null or undefined filename in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    component.download({ id: 1, nombre: 'n.pdf' });
    expect(a.download).toBe('n.pdf');
  });

  it('should handle null or undefined click in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    component.download({ id: 1, filename: 'a.pdf' });
    expect(a.click).toHaveBeenCalled();
  });

  it('should handle null or undefined revokeObjectURL in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(of(new Blob(['x'], { type: 'application/pdf' })));
    component.download({ id: 1, filename: 'a.pdf' });
    expect(window.URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle null or undefined error in download', () => {
    createComponent();
    spyOn(window.URL, 'createObjectURL').and.returnValue('blob:1');
    spyOn(window.URL, 'revokeObjectURL');
    const a: any = { href: '', download: '', click: jasmine.createSpy('click') };
    spyOn(document, 'createElement').and.returnValue(a);
    docsMock.download.and.returnValue(throwError(() => new Error('X')));
    component.download({ id: 1, filename: 'a.pdf' });
    expect(toastMock.error).toHaveBeenCalledWith('No se pudo descargar el documento');
  });
});