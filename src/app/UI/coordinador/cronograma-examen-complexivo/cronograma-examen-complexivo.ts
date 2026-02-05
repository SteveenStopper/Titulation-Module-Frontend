import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CronogramaUIC } from '../../../services/cronograma-uic.service';
import { CronogramaComplexivoService } from '../../../services/cronograma-complexivo.service';
import { PeriodService } from '../../../services/period.service';
import { CronogramaExportService } from '../../../services/cronograma-export.service';
import Swal from 'sweetalert2';

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
  // Opciones de período desde backend
  periodOptions: Array<{ id_academic_periods: number; name: string }> = [];
  selectedPeriodId: number | undefined;

  hasDraft = false;
  isLoading = false;

  get hasSelectedPeriod(): boolean {
    return Number.isFinite(Number(this.selectedPeriodId));
  }

  get isActivePeriodSelected(): boolean {
    const active = this.periodSvc.getActivePeriod();
    return !!active && !!this.model?.periodo && this.model.periodo === active;
  }

  constructor(private svc: CronogramaComplexivoService, private exportSvc: CronogramaExportService, private periodSvc: PeriodService) {
    // Iniciar con draft vacío; se define al seleccionar período
    this.model = this.svc.getDraft();
    this.ensureProyecto();
    this.model.periodo = undefined;
    this.validate();
    this.recomputeGlobalMin();
    // Cargar periodos desde backend
    this.periodSvc.listAll().subscribe(list => {
      const rows = Array.isArray(list) ? list : [];
      this.periodOptions = rows
        .map(p => ({ id_academic_periods: Number(p.id_academic_periods), name: String(p.name || '') }))
        .filter(p => Number.isFinite(Number(p.id_academic_periods)));
    });
  }

  onPeriodoChange(periodId: number | undefined) {
    if (!Number.isFinite(Number(periodId))) {
      this.selectedPeriodId = undefined;
      this.model = this.svc.getDraft();
      this.ensureProyecto();
      this.model.periodo = undefined;
      this.svc.setDraft(this.model);
      this.errors = [];
      this.recomputeGlobalMin();
      return;
    }
    this.selectedPeriodId = Number(periodId);
    const opt = this.periodOptions.find(p => Number(p.id_academic_periods) === Number(this.selectedPeriodId));
    const selectedName = opt?.name || String(this.selectedPeriodId);

    this.isLoading = true;
    this.svc.createDraft(Number(this.selectedPeriodId)).subscribe({
      next: (data) => {
        if (data) {
          this.model = data as any;
          this.model.periodo = selectedName;
        } else {
          const plantilla = this.svc.getUltimoPublicado();
          if (plantilla) {
            const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
            clonado.periodo = selectedName;
            this.model = clonado;
          } else {
            const nuevo = this.svc.getDraft();
            nuevo.periodo = selectedName;
            this.model = nuevo;
          }
        }
        this.ensureProyecto();
        this.svc.setDraft(this.model);
        this.validate();
        this.recomputeGlobalMin();
      },
      error: (_err) => {
        const plantilla = this.svc.getUltimoPublicado();
        if (plantilla) {
          const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
          clonado.periodo = selectedName;
          this.model = clonado;
        } else {
          const nuevo = this.svc.getDraft();
          nuevo.periodo = selectedName;
          this.model = nuevo;
        }
        this.ensureProyecto();
        this.svc.setDraft(this.model);
        this.validate();
        this.recomputeGlobalMin();
      },
      complete: () => { this.isLoading = false; }
    });
  }

  addRow() {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.addRow();
    this.model = this.svc.getDraft();
    this.ensureProyecto();
    this.validate();
  }

  removeRow(i: number) {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.removeRow(i);
    this.model = this.svc.getDraft();
    this.ensureProyecto();
    this.validate();
    this.recomputeGlobalMin();
  }
  publish() {
    if (!this.hasSelectedPeriod) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione un período antes de publicar.' });
      return;
    }
    if (!this.validate()) return;
    if (!this.model.periodo) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione un período antes de publicar.' });
      return;
    }
    const active = this.periodSvc.getActivePeriod();
    if (!active || this.model.periodo !== active) {
      Swal.fire({ icon: 'warning', title: 'Atención', text: 'Seleccione el período activo para poder publicar.' });
      return;
    }
    this.ensureProyecto();
    this.svc.setDraft(this.model);
    this.svc.publish().subscribe({
      next: (_res) => {
        this.svc.saveAsPublished(this.model.periodo!, this.model);
        Swal.fire({ icon: 'success', title: 'Publicado', text: 'Cronograma de Examen Complexivo publicado correctamente.' });
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err?.error?.message || 'No se pudo publicar el cronograma de Examen Complexivo.' });
      }
    });
  }
  onChange() {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.setDraft(this.model);
    this.ensureProyecto();
    this.validate();
    this.recomputeGlobalMin();
  }

  // Cargar un borrador editable independiente del período: clona el último publicado si existe, o un borrador vacío
  loadDraft() {
    const selectedName = this.model.periodo;
    if (selectedName) {
      this.periodSvc.listAll().subscribe(list => {
        const found = (list || []).find(p => p.name === selectedName);
        if (found?.id_academic_periods) {
          this.svc.createDraft(found.id_academic_periods).subscribe(data => {
            if (data) {
              this.model = data as any;
              this.model.periodo = selectedName;
              this.ensureProyecto();
              this.svc.setDraft(this.model);
              this.validate();
              this.recomputeGlobalMin();
            } else {
              const plantilla = this.svc.getUltimoPublicado();
              if (plantilla) {
                const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
                clonado.periodo = selectedName;
                this.model = clonado;
              } else {
                const nuevo = this.svc.getDraft();
                nuevo.periodo = selectedName;
                this.model = nuevo;
              }
              this.ensureProyecto();
              this.svc.setDraft(this.model);
              this.validate();
              this.recomputeGlobalMin();
            }
          });
          return;
        }
        // Fallback local si no se encuentra id
        const plantilla = this.svc.getUltimoPublicado();
        if (plantilla) {
          const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
          clonado.periodo = selectedName;
          this.model = clonado;
        } else {
          const nuevo = this.svc.getDraft();
          nuevo.periodo = selectedName;
          this.model = nuevo;
        }
        this.ensureProyecto();
        this.svc.setDraft(this.model);
        this.validate();
        this.recomputeGlobalMin();
      });
    } else {
      const plantilla = this.svc.getUltimoPublicado();
      if (plantilla) {
        const clonado: CronogramaUIC = JSON.parse(JSON.stringify(plantilla));
        clonado.periodo = undefined;
        this.model = clonado;
      } else {
        const nuevo = this.svc.getDraft();
        nuevo.periodo = undefined;
        this.model = nuevo;
      }
      this.ensureProyecto();
      this.svc.setDraft(this.model);
      this.validate();
      this.recomputeGlobalMin();
    }
  }

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
    // Primera hoja: 13 filas. Segunda hoja: el resto.
    this.exportSvc.exportPDF(this.model, { title: 'Cronograma Examen Complexivo', projectText: this.model.proyecto ?? '', perPageFirst: 13, perPageOthers: 9999 });
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
