import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentCronogramaService, AvanceView } from '../../../services/student-cronograma.service';
import { DocumentsService } from '../../../services/documents.service';
import { AuthService } from '../../../services/auth.service';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-avance-uic',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avance-uic.html',
  styleUrl: './avance-uic.scss'
})
export class AvanceUic {
  tutorNombre: string | null = null;
  notas: { p1: number | null; p2: number | null; p3: number | null } = { p1: null, p2: null, p3: null };
  loading = true;
  sending = false;
  informeFinalEntregado = false;

  constructor(
    private studentSvc: StudentCronogramaService,
    private documents: DocumentsService,
    private auth: AuthService,
  ) {
    this.loading = true;
    this.studentSvc.getAvanceUIC().subscribe((res: AvanceView) => {
      this.tutorNombre = res?.tutorNombre ?? null;
      // Mantener null cuando el parcial aún no está calificado.
      // Esto permite que el promedio se calcule solo con parciales efectivamente registrados,
      // consistente con el panel del Docente.
      this.notas.p1 = (typeof res?.p1 === 'number') ? res.p1 : null;
      this.notas.p2 = (typeof res?.p2 === 'number') ? res.p2 : null;
      this.notas.p3 = (typeof res?.p3 === 'number') ? res.p3 : null;
      this.loading = false;
    });

    const me = this.auth.currentUserValue;
    const id_user = me?.id_user;
    if (id_user) {
      this.documents.list({ tipo: 'uic_final', id_user: Number(id_user), page: 1, pageSize: 1 }).subscribe({
        next: (res: any) => {
          const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          this.informeFinalEntregado = data.length > 0;
        },
        error: () => { /* no bloquear */ }
      } as any);
    }
  }

  get promedio(): number {
    const vals = [this.notas.p1, this.notas.p2, this.notas.p3]
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!vals.length) return 0;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100) / 100;
  }

  // Informe Final (subida habilitada cuando haya nota de Parcial 2)
  informeArchivo: File | null = null;
  informeNombre = '';
  dragOverInforme = false;
  // Toast simple
  showToast = false;
  toastMsg = '';

  get puedeSubirInforme(): boolean {
    // Se considera "aparece calificación" si p2 es mayor que 0
    return (this.notas.p2 ?? 0) > 0 && !this.informeFinalEntregado;
  }

  get canEnviarInforme(): boolean {
    return !!(this.puedeSubirInforme && this.informeArchivo);
  }

  private isAllowedInformeFile(file: File): boolean {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();
    const allowedExt = ['pdf', 'doc', 'docx'];
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    return allowedExt.includes(ext) && (allowedMime.includes(mime) || mime === '');
  }

  private showInlineToast(msg: string) {
    this.toastMsg = msg;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  setInformeFile(file: File | null) {
    if (!file) {
      this.informeArchivo = null;
      this.informeNombre = '';
      return;
    }
    if (!this.isAllowedInformeFile(file)) {
      this.showInlineToast('Solo se permiten archivos PDF o Word (doc, docx)');
      this.informeArchivo = null;
      this.informeNombre = '';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showInlineToast('El archivo excede el límite de 20MB');
      this.informeArchivo = null;
      this.informeNombre = '';
      return;
    }
    this.informeArchivo = file;
    this.informeNombre = file.name;
  }

  onInformeChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files && input.files[0];
    this.setInformeFile(file || null);
  }

  onInformeDragOver(e: DragEvent) {
    e.preventDefault();
    if (!this.puedeSubirInforme || this.informeFinalEntregado) return;
    this.dragOverInforme = true;
  }

  onInformeDragLeave(e: DragEvent) {
    e.preventDefault();
    this.dragOverInforme = false;
  }

  onInformeDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOverInforme = false;
    if (!this.puedeSubirInforme || this.informeFinalEntregado) return;
    const file = e.dataTransfer?.files && e.dataTransfer.files[0];
    this.setInformeFile(file || null);
  }

  enviarInforme() {
    if (!this.canEnviarInforme || this.sending) return;
    this.sending = true;
    this.studentSvc.uploadUicFinal(this.informeArchivo!)
      .pipe(switchMap(() => this.studentSvc.sendInformeFinal()))
      .subscribe({
      next: (_res) => {
        this.toastMsg = 'Informe final enviado correctamente. Tu tutor revisará el documento.';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 4000);
        this.informeFinalEntregado = true;
        // Limpiar selección
        this.informeArchivo = null;
        this.informeNombre = '';
      },
      error: () => {
        this.toastMsg = 'No se pudo enviar el informe. Inténtalo nuevamente.';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 4000);
        this.sending = false;
      },
      complete: () => {
        this.sending = false;
      }
    });
  }
}
