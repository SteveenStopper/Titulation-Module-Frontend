import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-secretaria-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matricula.html',
  styleUrl: './matricula.scss'
})
export class Matricula {
  // Búsqueda
  search = '';
  // Filtro por carrera
  carreraFiltro = '';

  // Lista de carreras únicas derivada de los items
  get carreras(): string[] {
    return Array.from(new Set(this.items.map(i => i.carrera)));
  }

  // Mock de registros de matrícula con documentos
  items: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    solicitudUrl?: string | null;
    oficioUrl?: string | null;
    certificados: {
      vinculacion?: string | null;
      practicas?: string | null;
      ingles?: string | null;
    };
    estado: 'pendiente'|'aprobado'|'rechazado';
  }> = [
    {
      id: 1,
      estudiante: 'Ana Pérez',
      carrera: 'Sistemas',
      solicitudUrl: 'assets/mock/solicitud_ana.pdf',
      oficioUrl: 'assets/mock/oficio_ana.jpg',
      certificados: {
        vinculacion: 'assets/mock/cert_vinc_ana.pdf',
        practicas: 'assets/mock/cert_prac_ana.jpg',
        ingles: 'assets/mock/cert_ing_ana.pdf',
      },
      estado: 'pendiente',
    },
    {
      id: 2,
      estudiante: 'Luis Romero',
      carrera: 'Electromecánica',
      solicitudUrl: 'assets/mock/solicitud_luis.pdf',
      oficioUrl: null,
      certificados: {
        vinculacion: 'assets/mock/cert_vinc_luis.jpg',
        practicas: null,
        ingles: 'assets/mock/cert_ing_luis.pdf',
      },
      estado: 'pendiente',
    },
    {
      id: 3,
      estudiante: 'María Vásquez',
      carrera: 'Contabilidad',
      solicitudUrl: null,
      oficioUrl: 'assets/mock/oficio_maria.pdf',
      certificados: {
        vinculacion: null,
        practicas: 'assets/mock/cert_prac_maria.pdf',
        ingles: null,
      },
      estado: 'rechazado',
    },
  ];

  get filtered() {
    const q = this.search.trim().toLowerCase();
    return this.items.filter(i =>
      (!this.carreraFiltro || i.carrera === this.carreraFiltro) &&
      (!q || i.estudiante.toLowerCase().includes(q))
    );
  }

  // Toasts
  toasts: Array<{ id: number; message: string; type: 'success'|'error' }> = [];
  private toastSeq = 1;
  private showToast(message: string, type: 'success'|'error' = 'success') {
    const id = this.toastSeq++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.removeToast(id), 3000);
  }

  removeToast(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }

  // Acciones
  aceptar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    it.estado = 'aprobado';
    this.showToast(`Matrícula de ${it.estudiante} aprobada correctamente`, 'success');
  }

  rechazar(id: number) {
    const it = this.items.find(x => x.id === id);
    if (!it) return;
    it.estado = 'rechazado';
    this.showToast(`Matrícula de ${it.estudiante} rechazada`, 'error');
  }

  // Preview modal
  isPreviewOpen = false;
  previewUrl: string | null = null;
  previewType: 'image'|'pdf'|'other' = 'other';
  previewTitle = 'Documento';

  private openPreview(url?: string | null, title?: string) {
    if (!url) return;
    this.previewUrl = url;
    this.previewTitle = title || 'Documento';
    const lower = url.toLowerCase();
    if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) this.previewType = 'image';
    else if (lower.endsWith('.pdf')) this.previewType = 'pdf';
    else this.previewType = 'other';
    this.isPreviewOpen = true;
  }

  verSolicitud(url?: string | null) { this.openPreview(url, 'Solicitud'); }
  verOficio(url?: string | null) { this.openPreview(url, 'Oficio'); }
  verCertVinc(url?: string | null) { this.openPreview(url, 'Certificado - Vinculación'); }
  verCertPrac(url?: string | null) { this.openPreview(url, 'Certificado - Prácticas Pre Profesionales'); }
  verCertIngles(url?: string | null) { this.openPreview(url, 'Certificado - Inglés'); }

  cerrarPreview() {
    this.isPreviewOpen = false;
    this.previewUrl = null;
    this.previewType = 'other';
    this.previewTitle = 'Documento';
  }
}
