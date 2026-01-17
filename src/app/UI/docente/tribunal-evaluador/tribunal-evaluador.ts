import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tribunal-evaluador-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tribunal-evaluador.html',
  styleUrl: './tribunal-evaluador.scss'
})
export class TribunalEvaluadorDocente {
  estudiantesAsignados: Array<{ id: string; nombre: string; carrera: string | null; rol?: string; tribunal?: string }> = [];

  private mapRolToTribunal(rol?: string): string {
    const r = String(rol || '').toLowerCase();
    if (r.includes('1')) return 'Integrante 1';
    if (r.includes('2')) return 'Integrante 2';
    if (r.includes('3')) return 'Integrante 3';
    if (r.includes('pres')) return 'Integrante 1';
    if (r.includes('secr')) return 'Integrante 2';
    if (r.includes('voc')) return 'Integrante 3';
    return rol ? String(rol) : '';
  }

  constructor(private http: HttpClient) {
    this.http
      .get<Array<{ id: string; nombre: string; carrera: string | null; rol?: string }>>('/api/docente/tribunal-evaluador/estudiantes')
      .subscribe({
        next: (list) => {
          const rows = Array.isArray(list) ? list : [];
          this.estudiantesAsignados = rows.map(r => ({
            ...r,
            tribunal: this.mapRolToTribunal(r?.rol)
          }));
        },
        error: () => {
          this.estudiantesAsignados = [];
        }
      });
  }
}
