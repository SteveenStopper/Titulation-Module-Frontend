import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-gestion-modalidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-modalidad.html',
  styleUrl: './gestion-modalidad.scss'
})
export class GestionModalidad {
  activeTab: 'uic' | 'complexivo' = 'uic';

  // Formulario UIC
  uic = {
    tema: '',
    carrera: '',
    tutor: '',
    tipoComprobante: '' as 'deposito'|'transferencia'|'pago_en_linea'|''
  };
  comprobanteArchivo: File | null = null;
  comprobanteNombre = '';

  // Toast confirmación de modalidad
  showToast = false;
  toastMsg = '';
  // Validaciones UIC
  uicAttempted = false;
  uicSubmitted = false;
  // Estado de selección para Complexivo
  complexivoSelected = false;

  get canSubmitUIC(): boolean {
    return !!(
      this.uic.tema?.trim() &&
      this.uic.carrera?.trim() &&
      this.uic.tutor?.trim() &&
      this.uic.tipoComprobante &&
      this.comprobanteArchivo
    );
  }

  onComprobanteChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.comprobanteArchivo = file || null;
    this.comprobanteNombre = file ? file.name : '';
  }

  submitUIC() {
    this.uicAttempted = true;
    if (!this.canSubmitUIC) return;
    // Placeholder: enviar luego al backend
    console.log('UIC enviado:', { ...this.uic, comprobante: this.comprobanteNombre });
    this.uicSubmitted = true;
    this.toastMsg = 'Has enviado tu solicitud para UIC. Te notificaremos cuando esté habilitada en el menú principal.';
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);

    // Limpiar formulario luego de enviar
    this.uic = { tema: '', carrera: '', tutor: '', tipoComprobante: '' } as any;
    this.comprobanteArchivo = null;
    this.comprobanteNombre = '';
    // Ocultar mensajes de validación tras limpiar
    this.uicAttempted = false;
  }

  elegirComplexivo() {
    // Aquí luego se persistirá la modalidad seleccionada
    this.toastMsg = 'Has seleccionado la modalidad de Examen Complexivo. A partir de ahora, las opciones correspondientes estarán disponibles en el menú principal.';
    this.showToast = true;
    this.complexivoSelected = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }
}
