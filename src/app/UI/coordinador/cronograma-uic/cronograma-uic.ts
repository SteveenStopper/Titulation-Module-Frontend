import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CronogramaUicService, CronogramaUIC } from '../../../services/cronograma-uic.service';
import { PeriodService } from '../../../services/period.service';
import { CronogramaExportService } from '../../../services/cronograma-export.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cronograma-uic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cronograma-uic.html',
  styleUrl: './cronograma-uic.scss'
})
export class CronogramaUic {
  model!: CronogramaUIC;
  errors: string[] = [];
  // Fecha mínima global: una vez elegida alguna fecha, no se pueden elegir anteriores
  globalMinDate: string | null = null; // formato 'yyyy-MM-dd'
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

  constructor(private svc: CronogramaUicService, private exportSvc: CronogramaExportService, private periodSvc: PeriodService) {
    // Iniciar con draft vacío hasta que el usuario seleccione un período
    this.model = this.svc.getDraft();
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

  addRow() {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.addRow();
    this.model = this.svc.getDraft();
    this.validate();
    // no cambia min global hasta que se seleccione una fecha en la nueva fila
  }

  removeRow(i: number) {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.removeRow(i);
    this.model = this.svc.getDraft();
    this.validate();
    this.recomputeGlobalMin();
  }

  onPeriodoChange(periodId: number | undefined) {
    if (!Number.isFinite(Number(periodId))) {
      this.selectedPeriodId = undefined;
      this.model = this.svc.getDraft();
      this.model.periodo = undefined;
      this.svc.setDraft(this.model);
      this.errors = [];
      this.recomputeGlobalMin();
      return;
    }
    this.selectedPeriodId = Number(periodId);
    const opt = this.periodOptions.find(p => Number(p.id_academic_periods) === Number(this.selectedPeriodId));
    const selectedName = opt?.name || String(this.selectedPeriodId);

    // Crear/obtener borrador desde backend (clona el último publicado de UIC)
    this.isLoading = true;
    this.svc.createDraft(Number(this.selectedPeriodId)).subscribe({
      next: (data) => {
        if (data) {
          this.model = data as any;
          // Mantener el nombre del período en el modelo por compatibilidad (publish/validación)
          this.model.periodo = selectedName;
        } else {
          // Fallback local: plantilla o vacío
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
        this.svc.setDraft(this.model);
        this.validate();
        this.recomputeGlobalMin();
      },
      complete: () => { this.isLoading = false; }
    });
  }

  publish() {
    if (!this.hasSelectedPeriod) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Seleccione un período antes de publicar.',
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: 'swal-btn-confirm' }
      });
      return;
    }
    if (!this.validate()) {
      return;
    }
    if (!this.model.periodo) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Seleccione un período antes de publicar.',
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: 'swal-btn-confirm' }
      });
      return;
    }
    const active = this.periodSvc.getActivePeriod();
    if (!active || this.model.periodo !== active) {
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Seleccione el período activo para poder publicar.',
        confirmButtonText: 'Aceptar',
        customClass: { confirmButton: 'swal-btn-confirm' }
      });
      return;
    }
    this.svc.setDraft(this.model);
    this.svc.publish().subscribe({
      next: (_res) => {
        this.svc.saveAsPublished(this.model.periodo!, this.model);
        Swal.fire({
          icon: 'success',
          title: 'Publicado',
          text: 'Cronograma UIC publicado correctamente.',
          confirmButtonText: 'Aceptar',
          customClass: { confirmButton: 'swal-btn-confirm' }
        });
      },
      error: (err) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.error?.message || 'No se pudo publicar el cronograma UIC.',
          confirmButtonText: 'Aceptar',
          customClass: { confirmButton: 'swal-btn-cancel' }
        });
      }
    });
  }

  onChange() {
    if (!this.hasSelectedPeriod || !this.isActivePeriodSelected) return;
    this.svc.setDraft(this.model);
    this.validate();
    this.recomputeGlobalMin();
  }

  // Cargar un borrador editable independiente del período: usa el último publicado si existe, si no un borrador vacío
  loadDraft() {
    // Intentar crear/obtener borrador desde backend para el período seleccionado
    const selectedName = this.model.periodo;
    if (selectedName) {
      // Buscar id_academic_periods correspondiente
      this.periodSvc.listAll().subscribe(list => {
        const found = (list || []).find(p => p.name === selectedName);
        if (found?.id_academic_periods) {
          this.svc.createDraft(found.id_academic_periods).subscribe(data => {
            if (data) {
              this.model = data as any;
              this.model.periodo = selectedName;
              this.svc.setDraft(this.model);
              this.validate();
              this.recomputeGlobalMin();
            } else {
              // Fallback local si BE no devolvió datos
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
              this.svc.setDraft(this.model);
              this.validate();
              this.recomputeGlobalMin();
            }
          });
          return;
        }
        // Si no se encuentra id, proceder con fallback local
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
        this.svc.setDraft(this.model);
        this.validate();
        this.recomputeGlobalMin();
      });
    } else {
      // Sin período seleccionado: mantener fallback local
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
      this.svc.setDraft(this.model);
      this.validate();
      this.recomputeGlobalMin();
    }
  }

  // Reinicia únicamente las fechas de la fila indicada y mantiene la lógica de bloqueo global
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
      // Permitir una sola fecha: al menos una requerida
      if (!f.fechaInicio && !f.fechaFin) {
        errs.push(`Fila ${idx + 1}: Debe indicar al menos una fecha (inicio o fin).`);
      }
      if (f.fechaInicio && f.fechaFin && new Date(f.fechaInicio) > new Date(f.fechaFin)) {
        errs.push(`Fila ${idx + 1}: La fecha de inicio no puede ser mayor que la fecha de fin.`);
      }
    });
    this.errors = errs;
    return errs.length === 0;
  }

  exportCSV() {
    this.exportSvc.exportCSV(this.model, 'cronograma-uic.csv');
  }

  exportPDF() {
    this.exportSvc.exportPDF(this.model, { title: 'Cronograma UIC', projectText: this.model.proyecto ?? '' });
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // Calcula la fecha mínima global como la fecha más avanzada seleccionada en todo el cronograma
  private recomputeGlobalMin() {
    const dates: string[] = [];
    for (const f of this.model.filas || []) {
      if (f.fechaInicio) dates.push(f.fechaInicio);
      if (f.fechaFin) dates.push(f.fechaFin);
    }
    if (!dates.length) {
      this.globalMinDate = null;
      return;
    }
    // Formato ISO yyyy-MM-dd permite comparar por string
    dates.sort();
    this.globalMinDate = dates[dates.length - 1]; // fecha más reciente
  }

  // Min para fecha fin por fila: el mayor entre globalMinDate y fechaInicio de la fila
  minForFin(fila: { fechaInicio?: string | undefined }): string {
    const candidates = [this.globalMinDate, fila.fechaInicio].filter(Boolean) as string[];
    if (!candidates.length) return '';
    return candidates.sort()[candidates.length - 1];
  }
}
