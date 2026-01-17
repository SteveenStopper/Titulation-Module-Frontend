import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { Inicio } from './inicio';
import { NotificationsService } from '../../../services/notifications.service';

describe('Inicio', () => {
  let component: Inicio;
  let fixture: ComponentFixture<Inicio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inicio, HttpClientTestingModule],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            listMy: () => of([]),
            markRead: () => of(void 0),
            markAllRead: () => of(void 0),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Inicio);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
