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
  pago = { tipo: '', referencia: '', monto: null as number | null };
  pagoArchivo: File | null = null;
  pagoArchivoNombre = '';
  pagoEstado: 'enviado' | 'aprobado' | 'rechazado' | '' = '';

  onPagoFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.pagoArchivo = file || null;
    this.pagoArchivoNombre = file ? file.name : '';
  }

  submitPago() {
    this.pagoEstado = 'enviado';
    console.log('Pago enviado a Tesorería:', { ...this.pago, archivo: this.pagoArchivoNombre });
  }
}
