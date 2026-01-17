import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { Aranceles } from './aranceles';
import { TesoreriaService } from '../../../services/tesoreria.service';
import { NotificationsService } from '../../../services/notifications.service';

describe('Aranceles', () => {
  let component: Aranceles;
  let fixture: ComponentFixture<Aranceles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aranceles, HttpClientTestingModule],
      providers: [
        {
          provide: ToastrService,
          useValue: { success: () => {}, error: () => {}, warning: () => {}, info: () => {} },
        },
        {
          provide: TesoreriaService,
          useValue: {
            getResumen: () => of({ data: [] }),
            aprobar: () => of({}),
            rechazar: () => of({}),
            reconsiderar: () => of({}),
            generarCertificado: () => of({}),
            descargarCertificadoPorEstudiante: () => of(new Blob()),
          },
        },
        {
          provide: NotificationsService,
          useValue: { create: () => of({}), listMy: () => of([]), markRead: () => of(void 0), markAllRead: () => of(void 0) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Aranceles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
