import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CronogramaUicService, CronogramaUIC } from '../../../services/cronograma-uic.service';

@Component({
  selector: 'app-cronograma-uic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cronograma-uic.html',
  styleUrl: './cronograma-uic.scss'
})
export class CronogramaUic {
  data: CronogramaUIC | null = null;

  constructor(private svc: CronogramaUicService) {
    this.svc.published$.subscribe((c: CronogramaUIC | null) => this.data = c);
  }
}
