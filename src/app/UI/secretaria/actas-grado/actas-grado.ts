import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-actas-grado',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './actas-grado.html',
  styleUrl: './actas-grado.scss'
})
export class ActasGrado {
  items: Array<{
    id: number;
    estudiante: string;
    carrera: string | null;
    tribunal: string;
    calificacionTribunal: number | null;
    hojaCargada: boolean;
    guardado: boolean;
  }> = [];

  constructor(private http: HttpClient) {
    this.cargar();
  }

  isCalificacionValida(it: { calificacionTribunal: number | null }): boolean {
    return typeof it.calificacionTribunal === 'number' && it.calificacionTribunal >= 0 && it.calificacionTribunal <= 10;
  }

  generarHoja(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    this.http.post('/api/secretaria/actas/hoja', { id_user_student: id }, { responseType: 'blob', observe: 'response' })
      .subscribe({
        next: (resp) => {
          const blob = resp.body as Blob;
          if (blob) {
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
          } else { alert('No se recibió el archivo de la hoja.'); }
        },
        error: (err) => {
          if (err?.status === 501) alert('La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.');
          else alert('No se pudo generar la hoja.');
        }
      });
  }

  cargarHoja(id: number) {
    // Mantener compatibilidad si alguien llama este método por error
    alert('Usa el botón Cargar hoja de tribunal para seleccionar el archivo PDF.');
  }

  onFileSelected(event: Event, id: number) {
    const input = event.target as HTMLInputElement;
    const file = input?.files && input.files[0] ? input.files[0] : null;
    if (!file) return;
    const it = this.items.find(x => x.id === id);
    if (!it || !this.isCalificacionValida(it)) { alert('Ingrese una calificación válida antes de subir.'); return; }
    const form = new FormData();
    form.append('file', file);
    form.append('tipo', 'uic_acta_tribunal');
    form.append('usuario_id', String(id));
    this.http.post<any>('/api/documents', form).subscribe({
      next: (doc) => {
        const documento_id = Number(doc?.documento_id);
        if (!Number.isFinite(documento_id)) { alert('Subida OK, pero no se obtuvo documento_id'); return; }
        this.http.put('/api/secretaria/actas/link-hoja', { id_user_student: id, documento_id }).subscribe({
          next: () => { it.hojaCargada = true; alert('Hoja subida y vinculada.'); },
          error: () => { alert('No se pudo vincular la hoja.'); }
        });
      },
      error: (err) => {
        alert(err?.error?.message || 'No se pudo subir el archivo.');
      }
    });
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    if (!this.isCalificacionValida(it)) return;
    this.http.put('/api/secretaria/actas/nota', { id_user_student: id, score: it.calificacionTribunal }).subscribe({
      next: () => { it.guardado = true; alert('Calificación guardada.'); },
      error: () => { alert('No se pudo guardar la calificación.'); }
    });
  }

  private cargar() {
    this.http.get<Array<{ id: number; estudiante: string; carrera: string | null; tribunal: string; calificacionTribunal: number | null; hojaCargada: boolean }>>('/api/secretaria/actas')
      .subscribe(list => {
        this.items = (Array.isArray(list) ? list : []).map(r => ({
          id: r.id,
          estudiante: r.estudiante,
          carrera: r.carrera ?? null,
          tribunal: r.tribunal,
          calificacionTribunal: r.calificacionTribunal,
          hojaCargada: !!r.hojaCargada,
          guardado: false,
        }));
      });
  }
}
