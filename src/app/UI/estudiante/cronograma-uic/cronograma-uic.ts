import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentCronogramaService, CronogramaView } from '../../../services/student-cronograma.service';

@Component({
  selector: 'app-cronograma-uic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cronograma-uic.html',
  styleUrl: './cronograma-uic.scss'
})
export class CronogramaUic {
  data: CronogramaView | null = null;
  isLoading = true;
  private soloDel = new Set<number>([1, 4, 5, 15, 17, 20, 21]);

  isSoloDel(n: number | undefined | null): boolean {
    if (!n && n !== 0) return false;
    return this.soloDel.has(Number(n));
  }

  constructor(private svc: StudentCronogramaService) {
    this.isLoading = true;
    this.svc.getUICByActivePeriod().subscribe({
      next: (c) => {
        if (c && Array.isArray(c.filas)) {
          const canonical = [
            'Socialización del proceso de Titulación a los Coordinadores',
            'Presentación de documentos habilitantes',
            'Resolución de Aprobación de tema del Proyecto de Titulación',
            'Notificación a tutores',
            'Reunión inicial tutor - estudiante',
            'Desarrollo de páginas preliminares según el formato institucional',
            'Desarrollo del capítulo I: Planteamiento del Problema',
            'Desarrollo del capítulo II: Marco teórico',
            'Desarrollo del capítulo III: Metodología',
            'Desarrollo del capítulo IV: Resultados',
            'Desarrollo del capítulo V: Propuesta',
            'Desarrollo de conclusiones, recomendaciones, anexos',
            'Revisión y aprobación del tutor',
            'Corrección del proyecto',
            'Reunión final tutor - estudiante',
            'Solicitud de tribunal de grado',
            'Asignación de tribunal',
            'Lectura del Proyecto de Titulación',
            'Correcciones finales',
            'Entrega de tesis empastada',
            'Publicación de fechas de disertación del proyecto de titulación',
            'Disertación del proyecto de titulación'
          ].map(s => s.trim().toLowerCase());
          const norm = (s: string) => String(s || '').trim().toLowerCase();
          const sorted = [...c.filas].sort((a: any, b: any) => {
              const na = norm(a?.actividad);
              const nb = norm(b?.actividad);
              const ia = canonical.findIndex(ca => na.startsWith(ca));
              const ib = canonical.findIndex(cb => nb.startsWith(cb));
              const inA = ia === -1 ? Number.POSITIVE_INFINITY : ia;
              const inB = ib === -1 ? Number.POSITIVE_INFINITY : ib;
              if (inA !== inB) return inA - inB;
              const da = (a?.fechaInicio || a?.fechaFin) ? new Date(a.fechaInicio || a.fechaFin).getTime() : 0;
              const db = (b?.fechaInicio || b?.fechaFin) ? new Date(b.fechaInicio || b.fechaFin).getTime() : 0;
              if (da !== db) return da - db;
              return String(a?.actividad || '').localeCompare(String(b?.actividad || ''));
            });
          c = { ...c, filas: sorted.map((f: any, i: number) => ({ ...f, nro: i + 1 })) };
        }
        this.data = c;
      },
      complete: () => this.isLoading = false
    });
  }
}
