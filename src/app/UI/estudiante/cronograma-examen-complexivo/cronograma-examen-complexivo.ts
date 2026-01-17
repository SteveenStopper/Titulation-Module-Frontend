import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentCronogramaService, CronogramaView } from '../../../services/student-cronograma.service';

@Component({
  selector: 'app-cronograma-examen-complexivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cronograma-examen-complexivo.html',
  styleUrl: './cronograma-examen-complexivo.scss'
})
export class CronogramaExamenComplexivo {
  data: CronogramaView | null = null;
  isLoading = true;
  private soloDel = new Set<number>([1, 4, 14, 15, 16, 17]);

  isSoloDel(n: number | undefined | null): boolean {
    if (!n && n !== 0) return false;
    return this.soloDel.has(Number(n));
  }

  constructor(private svc: StudentCronogramaService) {
    this.isLoading = true;
    this.svc.getComplexivoByActivePeriod().subscribe({
      next: (c) => {
        if (c && Array.isArray(c.filas)) {
          const sorted = [...c.filas].sort((a: any, b: any) => {
            const da = (a?.fechaInicio || a?.fechaFin) ? new Date(a.fechaInicio || a.fechaFin).getTime() : 0;
            const db = (b?.fechaInicio || b?.fechaFin) ? new Date(b.fechaInicio || b.fechaFin).getTime() : 0;
            if (da !== db) return da - db;
            return String(a?.actividad || '').localeCompare(String(b?.actividad || ''));
          });
          // Intercambiar posiciones 11 y 12 (índices 10 y 11) si existen
          if (sorted.length >= 12) {
            const tmp = sorted[10];
            sorted[10] = sorted[11];
            sorted[11] = tmp;
          }
          c = { ...c, filas: sorted.map((f: any, i: number) => ({ ...f, nro: i + 1 })) };
        }
        this.data = c;
      },
      complete: () => this.isLoading = false
    });
  }
}
