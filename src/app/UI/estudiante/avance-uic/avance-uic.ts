import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avance-uic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avance-uic.html',
  styleUrl: './avance-uic.scss'
})
export class AvanceUic {
  // Nombre del tutor a cargo (demo hasta conectar backend)
  tutorNombre = 'Msc. Carlos Molina';

  // Notas por parcial (asignadas por el docente tutor)
  notas = {
    p1: 0,
    p2: 0,
    p3: 0,
  };

  get promedio(): number {
    const vals = [this.notas.p1, this.notas.p2, this.notas.p3];
    const validos = vals.filter(v => typeof v === 'number');
    const sum = validos.reduce((a, b) => a + (b || 0), 0);
    return validos.length ? parseFloat((sum / validos.length).toFixed(2)) : 0;
  }

  // Informe Final (subida habilitada cuando haya nota de Parcial 2)
  informeArchivo: File | null = null;
  informeNombre = '';
  // Toast simple
  showToast = false;
  toastMsg = '';

  get puedeSubirInforme(): boolean {
    // Se considera "aparece calificación" si p2 es mayor que 0
    return (this.notas.p2 ?? 0) > 0;
  }

  get canEnviarInforme(): boolean {
    return !!(this.puedeSubirInforme && this.informeArchivo);
  }

  onInformeChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.informeArchivo = file || null;
    this.informeNombre = file ? file.name : '';
  }

  enviarInforme() {
    if (!this.canEnviarInforme) return;
    console.log('Informe final enviado:', this.informeNombre);
    this.toastMsg = 'Informe final enviado correctamente. Tu tutor revisará el documento.';
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
    // Limpiar selección
    this.informeArchivo = null;
    this.informeNombre = '';
  }
}
