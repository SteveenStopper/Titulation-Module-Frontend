import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Tutorias } from './tutorias';

describe('Tutorias', () => {
  let component: Tutorias;
  let fixture: ComponentFixture<Tutorias>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tutorias]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tutorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
