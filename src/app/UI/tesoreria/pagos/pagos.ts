import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos.html',
  styleUrl: './pagos.scss'
})
export class Pagos {
  // Tabs
  tabs: Array<{ key: 'certificados'|'titulacion'|'acta'; label: string }> = [
    { key: 'certificados', label: 'Certificados' },
    { key: 'titulacion', label: 'Titulacion' },
    { key: 'acta', label: 'Acta de Grado' }
  ];
  activeTab: 'certificados'|'titulacion'|'acta' = 'certificados';

  setTab(tab: 'certificados'|'titulacion'|'acta') { this.activeTab = tab; }

  // Preview modal
  isPreviewOpen = false;
  previewUrl: string | null = null;
  previewType: 'image' | 'pdf' | 'other' = 'other';

  verComprobante(url: string) {
    this.previewUrl = url;
    const lower = url.toLowerCase();
    if (/(\.png|\.jpg|\.jpeg|\.webp|\.gif)$/.test(lower)) this.previewType = 'image';
    else if (lower.endsWith('.pdf')) this.previewType = 'pdf';
    else this.previewType = 'other';
    this.isPreviewOpen = true;
  }

  cerrarPreview() {
    this.isPreviewOpen = false;
    this.previewUrl = null;
    this.previewType = 'other';
  }

  // Toasts
  toasts: Array<{ id: number; message: string; type: 'success'|'error' }>=[];
  private toastSeq = 1;
  showToast(message: string, type: 'success'|'error' = 'success') {
    const id = this.toastSeq++;
    this.toasts.push({ id, message, type });
    setTimeout(() => this.toasts = this.toasts.filter(t => t.id !== id), 3000);
  }

  // ---------------- Certificados ----------------
  // Filtro para Certificados
  searchCertificados = '';

  // Datos estáticos (mock) para Certificados
  certificados: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    referencia: string;
    monto: number;
    comprobanteUrl: string;
    estado: 'pendiente'|'aprobado'|'rechazado';
  }> = [
    { id: 1, estudiante: 'Ana Pérez', carrera: 'Ingeniería de Sistemas', referencia: 'CERT-990001', monto: 50.00, comprobanteUrl: 'assets/mock/cert_ana.jpg', estado: 'pendiente' },
    { id: 2, estudiante: 'Luis Romero', carrera: 'Administración', referencia: 'CERT-990002', monto: 50.00, comprobanteUrl: 'assets/mock/cert_luis.pdf', estado: 'pendiente' },
    { id: 3, estudiante: 'María Vásquez', carrera: 'Contabilidad', referencia: 'CERT-990003', monto: 50.00, comprobanteUrl: 'assets/mock/cert_maria.jpg', estado: 'aprobado' },
  ];

  get filteredCertificados() {
    const q = this.searchCertificados.trim().toLowerCase();
    if (!q) return this.certificados;
    return this.certificados.filter(m =>
      m.estudiante.toLowerCase().includes(q) ||
      m.carrera.toLowerCase().includes(q) ||
      m.referencia.toLowerCase().includes(q)
    );
  }

  aceptarCertificado(id: number) {
    const it = this.certificados.find(x => x.id === id);
    if (!it) return;
    it.estado = 'aprobado';
    this.showToast(`Certificado aprobado para ${it.estudiante}`, 'success');
  }

  rechazarCertificado(id: number) {
    const it = this.certificados.find(x => x.id === id);
    if (!it) return;
    it.estado = 'rechazado';
    this.showToast(`Certificado rechazado para ${it.estudiante}`, 'error');
  }

  // ---------------- Titulación ----------------
  // Filtro para Titulación
  searchTitulacion = '';

  // Datos estáticos (mock) para Titulación
  titulacion: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    referencia: string;
    monto: number;
    comprobanteUrl: string;
    estado: 'pendiente'|'aprobado'|'rechazado';
  }> = [
    { id: 11, estudiante: 'Ana Pérez', carrera: 'Ingeniería de Sistemas', referencia: 'TIT-880001', monto: 180.00, comprobanteUrl: 'assets/mock/tit_ana.pdf', estado: 'pendiente' },
    { id: 12, estudiante: 'Luis Romero', carrera: 'Administración', referencia: 'TIT-880002', monto: 180.00, comprobanteUrl: 'assets/mock/tit_luis.jpg', estado: 'pendiente' },
    { id: 13, estudiante: 'María Vásquez', carrera: 'Contabilidad', referencia: 'TIT-880003', monto: 180.00, comprobanteUrl: 'assets/mock/tit_maria.jpg', estado: 'aprobado' },
  ];

  get filteredTitulacion() {
    const q = this.searchTitulacion.trim().toLowerCase();
    if (!q) return this.titulacion;
    return this.titulacion.filter(m =>
      m.estudiante.toLowerCase().includes(q) ||
      m.carrera.toLowerCase().includes(q) ||
      m.referencia.toLowerCase().includes(q)
    );
  }

  aceptarTitulacion(id: number) {
    const it = this.titulacion.find(x => x.id === id);
    if (!it) return;
    it.estado = 'aprobado';
    this.showToast(`Titulación aprobada para ${it.estudiante}`, 'success');
  }

  rechazarTitulacion(id: number) {
    const it = this.titulacion.find(x => x.id === id);
    if (!it) return;
    it.estado = 'rechazado';
    this.showToast(`Titulación rechazada para ${it.estudiante}`, 'error');
  }

  // ---------------- Acta de Grado ----------------
  // Filtro para Acta
  searchActa = '';

  // Datos estáticos (mock) para Acta de Grado
  acta: Array<{
    id: number;
    estudiante: string;
    carrera: string;
    referencia: string;
    monto: number;
    comprobanteUrl: string;
    estado: 'pendiente'|'aprobado'|'rechazado';
  }> = [
    { id: 21, estudiante: 'Ana Pérez', carrera: 'Ingeniería de Sistemas', referencia: 'ACT-770001', monto: 60.00, comprobanteUrl: 'assets/mock/acta_ana.pdf', estado: 'pendiente' },
    { id: 22, estudiante: 'Luis Romero', carrera: 'Administración', referencia: 'ACT-770002', monto: 60.00, comprobanteUrl: 'assets/mock/acta_luis.jpg', estado: 'aprobado' },
    { id: 23, estudiante: 'María Vásquez', carrera: 'Contabilidad', referencia: 'ACT-770003', monto: 60.00, comprobanteUrl: 'assets/mock/acta_maria.jpg', estado: 'rechazado' },
  ];

  get filteredActa() {
    const q = this.searchActa.trim().toLowerCase();
    if (!q) return this.acta;
    return this.acta.filter(m =>
      m.estudiante.toLowerCase().includes(q) ||
      m.carrera.toLowerCase().includes(q) ||
      m.referencia.toLowerCase().includes(q)
    );
  }

  aceptarActa(id: number) {
    const it = this.acta.find(x => x.id === id);
    if (!it) return;
    it.estado = 'aprobado';
    this.showToast(`Acta de grado aprobada para ${it.estudiante}`, 'success');
  }

  rechazarActa(id: number) {
    const it = this.acta.find(x => x.id === id);
    if (!it) return;
    it.estado = 'rechazado';
    this.showToast(`Acta de grado rechazada para ${it.estudiante}`, 'error');
  }
}
