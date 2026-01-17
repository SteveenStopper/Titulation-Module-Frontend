import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

import { Pagos } from './pagos';
import { VouchersService } from '../../../services/vouchers.service';
import { NotificationsService } from '../../../services/notifications.service';

describe('Pagos', () => {
  let component: Pagos;
  let fixture: ComponentFixture<Pagos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Pagos],
      providers: [
        {
          provide: ToastrService,
          useValue: { success: () => {}, error: () => {}, warning: () => {}, info: () => {} },
        },
        {
          provide: VouchersService,
          useValue: {
            list: () => of({ data: [], pagination: { total: 0, totalPages: 1 } }),
            download: () => of(new Blob()),
            approve: () => of({}),
            reject: () => of({}),
          },
        },
        {
          provide: NotificationsService,
          useValue: { create: () => of({}), listMy: () => of([]), markRead: () => of(void 0), markAllRead: () => of(void 0) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Pagos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
