import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { CronogramaComplexivoService } from '../../../services/cronograma-complexivo.service';
import { CronogramaUIC } from '../../../services/cronograma-uic.service';

@Component({
  selector: 'app-cronograma-examen-complexivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cronograma-examen-complexivo.html',
  styleUrl: './cronograma-examen-complexivo.scss'
})
export class CronogramaExamenComplexivo {
  published$!: Observable<CronogramaUIC | null>;

  constructor(private svc: CronogramaComplexivoService) {
    this.published$ = this.svc.published$;
  }
}
