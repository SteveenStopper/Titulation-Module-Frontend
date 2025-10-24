import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvanceUic } from './avance-uic';

describe('AvanceUic', () => {
  let component: AvanceUic;
  let fixture: ComponentFixture<AvanceUic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvanceUic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvanceUic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
