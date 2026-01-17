import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-calificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calificacion.html',
  styleUrl: './calificacion.scss'
})
export class Calificacion {
  items: Array<{ id: number; estudiante: string; carrera: string; nota: number | null; guardado: boolean }> = [];
  private adminIngles = false;

  constructor(private http: HttpClient, private auth: AuthService) {
    const user = this.auth.currentUserValue;
    this.adminIngles = !!user && (user.roles?.includes('Administrador') || user.roles?.includes('Ingles'));
    if (this.adminIngles) {
      this.cargarElegibles();
    } else {
      const nombre = user ? `${user.firstname} ${user.lastname}`.trim() : 'Yo';
      this.http.get<any>('/api/english/my').subscribe(data => {
        const score = (data && typeof data.score === 'number') ? Number(data.score) : null;
        const saved = data && (data.status === 'saved' || data.status === 'validated');
        this.items = [
          { id: Number(data?.id || 0), estudiante: nombre, carrera: '', nota: score, guardado: !!saved }
        ];
      }, _ => {
        this.items = [ { id: 0, estudiante: nombre, carrera: '', nota: null, guardado: false } ];
      });
    }
  }

  isNotaLista(it: { nota: number | null }): boolean {
    return typeof it.nota === 'number';
  }

  guardar(id: number) {
    const it = this.items.find(x => x.id === id || id === 0);
    if (!it) return;
    if (!this.isNotaLista(it)) return;
    const score = Number(it.nota);
    if (this.adminIngles) {
      // En modo Admin/Inglés, 'estudiante' es el nombre del alumno y debemos guardar para ese usuario.
      const target = this.lookupTargetUserIdByNombre(it.estudiante);
      if (!target) { alert('No se pudo resolver el estudiante.'); return; }
      this.http.post('/api/english/save-for', { target_user_id: target, score }).subscribe({
        next: (_res: any) => {
          it.guardado = true;
          alert('Calificación guardada.');
        },
        error: () => { alert('No se pudo guardar la calificación.'); }
      });
    } else {
      this.http.post('/api/english/save', { score }).subscribe({
        next: (res: any) => {
          it.guardado = true;
          if (res && typeof res.id === 'number') it.id = Number(res.id);
          alert('Calificación guardada.');
        },
        error: () => {
          alert('No se pudo guardar la calificación.');
        }
      });
    }
  }

  generarCertificado(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    this.http.post('/api/english/certificate', {}, { responseType: 'blob', observe: 'response' }).subscribe({
      next: (resp) => {
        const blob = resp.body as Blob;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
        } else {
          alert('No se recibió el archivo del certificado.');
        }
      },
      error: (err) => {
        if (err?.status === 501) {
          alert('La generación de PDF no está disponible en el servidor. Instalar dependencia pdfkit.');
        } else {
          alert('No se pudo generar el certificado.');
        }
      }
    });
  }

  private cargarElegibles() {
    // Lista de estudiantes aprobados en Tesorería
    this.http.get<Array<{ id_user: number; fullname: string; score?: number|null; status?: string|null }>>('/api/english/eligible')
      .subscribe(rows => {
        const list = Array.isArray(rows) ? rows : [];
        this._eligibleMap = new Map<number, string>();
        this._reverseEligibleMap = new Map<string, number>();
        this.items = list.map(r => {
          this._eligibleMap.set(r.id_user, r.fullname);
          this._reverseEligibleMap.set(r.fullname, r.id_user);
          return {
            id: r.id_user, // usamos id_user como id local de fila
            estudiante: r.fullname,
            carrera: '',
            nota: r.score != null ? Number(r.score) : null,
            guardado: r.status === 'saved' || r.status === 'validated'
          };
        });
      });
  }

  private _eligibleMap = new Map<number, string>();
  private _reverseEligibleMap = new Map<string, number>();
  private lookupTargetUserIdByNombre(nombre: string): number | null {
    const id = this._reverseEligibleMap.get(nombre);
    return Number.isFinite(Number(id)) ? Number(id) : null;
  }
}
