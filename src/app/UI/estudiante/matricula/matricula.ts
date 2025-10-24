import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-matricula',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './matricula.html',
  styleUrl: './matricula.scss'
})
export class Matricula {
  activeTab: 'requisitos' = 'requisitos';

  // Requisitos form state
  requisitosHabilitados = true; // Luego: depender de aprobación de Tesorería
  reqArchivos: { solicitud?: File; oficio?: File; otro?: File } = {};
  reqNombres: { solicitud?: string; oficio?: string; otro?: string } = {};
  reqTipos: { solicitud?: string; oficio?: string; otro?: string } = {};
  solicitudTipos = ['Solicitud'];
  oficioTipos = ['Oficio'];
  otroTipos = ['Certificado de vinculación', 'Certificado de prácticas pre profesionales', 'Certificado de inglés'];
  // Para 'Otro documento' múltiple con tipo por archivo
  reqOtros: Array<{ file: File; nombre: string; tipo: string | '' }> = [];
  reqEstado: 'enviado' | 'aprobado' | 'rechazado' | '' = '';

  get hasOtrosSinTipo(): boolean {
    return this.reqOtros.some(o => !o.tipo);
  }

  get canSubmitRequisitos(): boolean {
    return !!(this.requisitosHabilitados
      && this.reqArchivos.solicitud
      && this.reqArchivos.oficio
      && this.reqOtros.length
      && !this.hasOtrosSinTipo);
  }

  

  onReqFile(e: Event, tipo: 'solicitud'|'oficio'|'otro') {
    const input = e.target as HTMLInputElement;
    if (tipo === 'otro') {
      const files = (input.files ? Array.from(input.files) : []) as File[];
      // Agregar sin duplicar por nombre+tamaño
      for (const f of files) {
        const exists = this.reqOtros.some(o => o.nombre === f.name && o.file.size === f.size);
        if (!exists) {
          this.reqOtros.push({ file: f, nombre: f.name, tipo: '' });
        }
      }
      // Limpiar legacy single state para 'otro'
      delete this.reqArchivos.otro;
      delete this.reqNombres.otro;
      // Permitir seleccionar nuevamente el mismo archivo en eventos futuros
      input.value = '';
    } else {
      const file = input.files && input.files[0];
      if (file) {
        this.reqArchivos[tipo] = file;
        this.reqNombres[tipo] = file.name;
      } else {
        delete this.reqArchivos[tipo];
        delete this.reqNombres[tipo];
      }
    }
  }

  removeOtro(index: number) {
    this.reqOtros.splice(index, 1);
  }

  submitRequisitos() {
    this.reqEstado = 'enviado';
    console.log('Requisitos enviados a Secretaría:', {
      solicitud: this.reqNombres.solicitud,
      oficio: this.reqNombres.oficio,
      otros: this.reqOtros.map(o => ({ nombre: o.nombre, tipo: o.tipo })),
      tipos: this.reqTipos
    });
  }
}
