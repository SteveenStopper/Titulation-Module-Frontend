import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { NotaEstudiantes } from './nota-estudiantes';
import { DocumentsService } from '../../../services/documents.service';
import { SecretariaService } from '../../../services/secretaria.service';
import { NotificationsService } from '../../../services/notifications.service';

describe('NotaEstudiantes', () => {
  let component: NotaEstudiantes;
  let fixture: ComponentFixture<NotaEstudiantes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotaEstudiantes],
      providers: [
        {
          provide: ToastrService,
          useValue: { success: () => {}, error: () => {}, warning: () => {}, info: () => {} },
        },
        {
          provide: SecretariaService,
          useValue: {
            listPromedios: () => of({ data: [] }),
            generarCertNotas: () => of({ documento_id: 1 }),
            approve: () => of({}),
            reject: () => of({}),
          },
        },
        {
          provide: DocumentsService,
          useValue: { download: () => of(new Blob()) },
        },
        {
          provide: NotificationsService,
          useValue: { create: () => of({}), listMy: () => of([]), markRead: () => of(void 0), markAllRead: () => of(void 0) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotaEstudiantes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
