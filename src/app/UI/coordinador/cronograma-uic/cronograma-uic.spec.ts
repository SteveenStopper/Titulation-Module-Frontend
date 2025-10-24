import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CronogramaUic } from './cronograma-uic';

describe('CronogramaUic', () => {
  let component: CronogramaUic;
  let fixture: ComponentFixture<CronogramaUic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CronogramaUic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CronogramaUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
