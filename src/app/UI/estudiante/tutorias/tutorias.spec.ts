import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Tutorias } from './tutorias';
import { StudentCronogramaService } from '../../../services/student-cronograma.service';

describe('Tutorias', () => {
  let component: Tutorias;
  let fixture: ComponentFixture<Tutorias>;
  let svcMock: any;

  beforeEach(async () => {
    svcMock = { getMyComplexivoMaterias: () => of([]) };
    await TestBed.configureTestingModule({
      imports: [Tutorias],
      providers: [
        {
          provide: StudentCronogramaService,
          useValue: svcMock,
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Tutorias);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map materias with defaults from service response', () => {
    svcMock.getMyComplexivoMaterias = () => of([
      { codigo: 'M1', nombre: 'Materia 1', docente: 'Doc 1' },
      { codigo: 'M2', nombre: 'Materia 2', docente: null },
    ] as any);

    fixture = TestBed.createComponent(Tutorias);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.materias.length).toBe(2);
    expect(component.materias[0]).toEqual({
      codigo: 'M1',
      nombre: 'Materia 1',
      docente: 'Doc 1',
      horario: '',
      aula: '',
      estado: 'En curso',
      proximaSesion: ''
    });
    expect(component.materias[1].docente).toBeNull();
  });
});
