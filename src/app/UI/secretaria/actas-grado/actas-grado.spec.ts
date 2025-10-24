import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActasGrado } from './actas-grado';

describe('ActasGrado', () => {
  let component: ActasGrado;
  let fixture: ComponentFixture<ActasGrado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActasGrado]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActasGrado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
