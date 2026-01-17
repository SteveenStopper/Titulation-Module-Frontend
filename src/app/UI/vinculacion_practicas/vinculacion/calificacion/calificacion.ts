import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-calificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificacion.html',
  styleUrl: './calificacion.scss'
})
export class Calificacion {
  items: Array<{ id: number; estudiante: string; carrera: string; nota: number | null; guardado: boolean }> = [];
  private allowed = false;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.currentUserValue;
    this.allowed = !!user && (user.roles?.includes('Administrador') || user.roles?.includes('Vinculacion_Practicas'));
    if (this.allowed) this.cargarElegibles();
  }

  isNotaLista(it: { nota: number | null }): boolean {
    return typeof it.nota === 'number';
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isNotaLista(it)) return;
    const score = Number(it.nota);
    this.http.post('/api/vinculacion/save-for', { target_user_id: id, score }).subscribe({
      next: () => { it.guardado = true; alert('Calificación guardada.'); },
      error: () => { alert('No se pudo guardar la calificación.'); }
    });
  }

  generarCertificado(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    this.http.post('/api/vinculacion/certificate', {}, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else { alert('No se recibió el archivo del certificado.'); }
      },
      error: (err) => {
        if (err?.status === 501) alert('La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.');
        else alert('No se pudo generar el certificado.');
      }
    });
  }

  private cargarElegibles() {
    this.http.get<Array<{ id_user: number; fullname: string; score?: number|null; status?: string|null }>>('/api/vinculacion/eligible')
      .subscribe(rows => {
        const list = Array.isArray(rows) ? rows : [];
        this.items = list.map(r => ({
          id: r.id_user,
          estudiante: r.fullname,
          carrera: '',
          nota: r.score != null ? Number(r.score) : null,
          guardado: r.status === 'saved' || r.status === 'validated'
        }));
      });
  }
}
