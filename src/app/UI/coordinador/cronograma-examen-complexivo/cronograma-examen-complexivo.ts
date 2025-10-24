import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CronogramaUIC } from '../../../services/cronograma-uic.service';
import { CronogramaComplexivoService } from '../../../services/cronograma-complexivo.service';
import { PeriodService } from '../../../services/period.service';
import { CronogramaExportService } from '../../../services/cronograma-export.service';

@Component({
  selector: 'app-cronograma-examen-complexivo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cronograma-examen-complexivo.html',
  styleUrl: './cronograma-examen-complexivo.scss'
})
export class CronogramaExamenComplexivo {
  model!: CronogramaUIC;
  errors: string[] = [];
  globalMinDate: string | null = null;
  // Opciones temporales de período (hasta conectar backend)
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];

  hasDraft = false;

  constructor(private svc: CronogramaComplexivoService, private exportSvc: CronogramaExportService, private periodSvc: PeriodService) {
    // Iniciar con draft vacío; se define al seleccionar período
    this.model = this.svc.getDraft();
    this.ensureProyecto();
    this.validate();
    this.recomputeGlobalMin();
  }

  onPeriodoChange(periodo: string | undefined) {
    if (!periodo) return;
    const existente = this.svc.getByPeriod(periodo);
    if (existente) {
      this.model = existente;
    } else {
      const plantilla = this.svc.getUltimoPublicado();
      if (plantilla) {
        const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
        clonado.periodo = periodo;
        this.model = clonado;
      } else {
        const nuevo = this.svc.getDraft();
        nuevo.periodo = periodo;
        this.model = nuevo;
      }
    }
    this.ensureProyecto();
    this.svc.setDraft(this.model);
    this.validate();
    this.recomputeGlobalMin();
  }

  addRow() { this.svc.addRow(); this.model = this.svc.getDraft(); this.ensureProyecto(); this.validate(); }
  removeRow(i: number) { this.svc.removeRow(i); this.model = this.svc.getDraft(); this.ensureProyecto(); this.validate(); this.recomputeGlobalMin(); }
  publish() {
    if (!this.validate()) return;
    if (!this.model.periodo) { alert('Seleccione un período antes de publicar.'); return; }
    const active = this.periodSvc.getActivePeriod();
    if (!active || this.model.periodo !== active) { alert('Seleccione el período activo para poder publicar.'); return; }
    this.ensureProyecto();
    this.svc.setDraft(this.model);
    this.svc.saveAsPublished(this.model.periodo, this.model);
  }
  onChange() { this.svc.setDraft(this.model); this.ensureProyecto(); this.validate(); this.recomputeGlobalMin(); }

  private ensureProyecto() {
    if (!this.model.proyecto?.trim()) this.model.proyecto = 'EXAMEN COMPLEXIVO';
  }

  resetRowDates(i: number) {
    if (!this.model.filas || !this.model.filas[i]) return;
    this.model.filas[i].fechaInicio = undefined;
    this.model.filas[i].fechaFin = undefined;
    this.onChange();
  }

  validate(): boolean {
    const errs: string[] = [];
    if (!this.model.titulo?.trim()) errs.push('El título es requerido.');
    if (!this.model.periodo?.trim()) errs.push('El período es requerido.');
    if (!this.model.proyecto?.trim()) errs.push('El proyecto es requerido.');
    if (!this.model.filas?.length) errs.push('Agregue al menos una fila al cronograma.');
    this.model.filas?.forEach((f: any, idx: number) => {
      if (!f.actividad?.trim()) errs.push(`Fila ${idx + 1}: La actividad/descripcion es requerida.`);
      if (!f.responsable?.trim()) errs.push(`Fila ${idx + 1}: El responsable es requerido.`);
      if (!f.fechaInicio && !f.fechaFin) errs.push(`Fila ${idx + 1}: Debe indicar al menos una fecha (inicio o fin).`);
      if (f.fechaInicio && f.fechaFin && new Date(f.fechaInicio) > new Date(f.fechaFin)) {
        errs.push(`Fila ${idx + 1}: La fecha de inicio no puede ser mayor que la fecha de fin.`);
      }
    });
    this.errors = errs; return errs.length === 0;
  }

  exportCSV() { this.exportSvc.exportCSV(this.model, 'cronograma-examen-complexivo.csv'); }

  exportPDF() {
    this.exportSvc.exportPDF(this.model, { title: 'Cronograma Examen Complexivo', projectText: (this.model.proyecto ?? 'EXAMEN COMPLEXIVO').toUpperCase() });
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement; if (!el) return;
    el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`;
  }

  private recomputeGlobalMin() {
    const dates: string[] = [];
    for (const f of this.model.filas || []) { if (f.fechaInicio) dates.push(f.fechaInicio); if (f.fechaFin) dates.push(f.fechaFin); }
    if (!dates.length) { this.globalMinDate = null; return; }
    dates.sort(); this.globalMinDate = dates[dates.length - 1];
  }

  minForFin(fila: { fechaInicio?: string | undefined }): string {
    const candidates = [this.globalMinDate, fila.fechaInicio].filter(Boolean) as string[];
    if (!candidates.length) return ''; return candidates.sort()[candidates.length - 1];
  }
}
