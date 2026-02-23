import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tribunal-evaluador-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tribunal-evaluador.html',
  styleUrl: './tribunal-evaluador.scss'
})
export class TribunalEvaluadorDocente {
  estudiantesAsignados: Array<{ id: string; nombre: string; carrera: string | null; rol?: string; tribunal?: string }> = [];

  carreraFiltro = '';

  get carrerasDisponibles(): string[] {
    const set = new Set<string>();
    for (const e of this.estudiantesAsignados || []) {
      const c = String(e?.carrera || '').trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  get estudiantesFiltrados() {
    const c = String(this.carreraFiltro || '').trim();
    if (!c) return this.estudiantesAsignados;
    return (this.estudiantesAsignados || []).filter(e => String(e?.carrera || '').trim() === c);
  }

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
            carrera: (() => {
              const raw = (r as any)?.carrera
                ?? (r as any)?.career_name
                ?? (r as any)?.career
                ?? (r as any)?.careerName
                ?? (r as any)?.carrera_nombre
                ?? (r as any)?.carreraNombre
                ?? null;
              const s = String(raw ?? '').trim();
              return s ? s : null;
            })(),
            tribunal: this.mapRolToTribunal(r?.rol)
          }));
        },
        error: () => {
          this.estudiantesAsignados = [];
        }
      });
  }
}
