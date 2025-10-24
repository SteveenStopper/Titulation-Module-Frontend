import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Aranceles } from './aranceles';

describe('Aranceles', () => {
  let component: Aranceles;
  let fixture: ComponentFixture<Aranceles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Aranceles]
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
