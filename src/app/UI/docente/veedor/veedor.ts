import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-veedor-docente',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './veedor.html',
  styleUrl: './veedor.scss'
})
export class VeedorDocente {
  carrerasAsignadas: string[] = [];

  constructor(private http: HttpClient) {
    this.http
      .get<string[]>('/api/docente/veedor/estudiantes')
      .subscribe({
        next: (list) => {
          const names = (Array.isArray(list) ? list : [])
            .map(x => (x == null ? '' : String(x)))
            .map(x => x.trim())
            .filter(Boolean);
          this.carrerasAsignadas = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        },
        error: () => {
          this.carrerasAsignadas = [];
        }
      });
  }
}
