import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnrollmentsService, EnrollmentCurrent, Modality } from '../../../services/enrollments.service';
import { StudentApiService } from '../../../services/student-api.service';
import { MeService } from '../../../services/me.service';
import { ModalityService } from '../../../services/modality.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DocumentsService } from '../../../services/documents.service';

@Component({
  selector: 'app-gestion-modalidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-modalidad.html',
  styleUrl: './gestion-modalidad.scss'
})
export class GestionModalidad {
  activeTab: 'uic' | 'complexivo' = 'uic';
  // Estado de backend
  isLoading = false;
  current: EnrollmentCurrent | null = null;

  // Validaciones (gating)
  validationsLoading = false;
  canChooseModality = true;
  validationsMsg = '';

  // Modo prueba: permite bypass del gating con query param
  bypassValidations = false;

  // Formulario UIC
  uic = {
    tema: '',
    carrera: '',
  };

  docentes: Array<{ id_user: number; fullname: string }> = [];
  selectedTutorId: number | null = null;

  carreras: Array<{ id: number; nombre: string }> = [];
  selectedCareerId: number | null = null;

  // Estado del formulario UIC persistido
  uicTopicLoading = false;
  uicTopicId: number | null = null;

  // Toast confirmación de modalidad
  showToast = false;
  toastMsg = '';
  // Validaciones UIC
  uicAttempted = false;
  uicSubmitted = false;
  // Estado de selección para Complexivo
  complexivoSelected = false;
  // Flujo de preselección para UIC (mostrar formulario antes de confirmar selección)
  preselectUIC = false;

  get selectedModality(): Modality | null {
    return (this.current?.modality as Modality | undefined) || null;
  }

  get canSubmitUIC(): boolean {
    return !!(
      this.uic.tema?.trim() &&
      Number.isFinite(Number(this.selectedCareerId)) &&
      Number.isFinite(Number(this.selectedTutorId))
    );
  }

  constructor(
    private enroll: EnrollmentsService,
    private studentApi: StudentApiService,
    private me: MeService,
    private modalitySvc: ModalityService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private documents: DocumentsService,
  ) {}

  ngOnInit() {
    const bypass = String(this.route.snapshot.queryParamMap.get('bypassValidations') || '').toLowerCase();
    this.bypassValidations = bypass === '1' || bypass === 'true' || bypass === 'yes';

    // 1) Validaciones (Requisitos aprobados) => gating
    if (this.bypassValidations) {
      this.validationsLoading = false;
      this.canChooseModality = true;
      this.validationsMsg = '';
    } else {
      this.validationsLoading = true;
      this.documents.list({ category: 'matricula', page: 1, pageSize: 200 }).subscribe({
        next: (res: any) => {
          const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          const docs = raw.map((d: any) => ({
            ...d,
            estado: d?.status ?? d?.estado ?? 'en_revision',
          }));

          const hasAny = docs.length > 0;
          const allApproved = hasAny && docs.every((d: any) => String(d.estado || '').toLowerCase() === 'aprobado');

          this.canChooseModality = allApproved;
          this.validationsMsg = allApproved
            ? ''
            : 'Debes tener aprobados los requisitos de Matrícula para elegir tu modalidad.';
        },
        error: () => {
          this.canChooseModality = false;
          this.validationsMsg = 'No se pudo verificar tus requisitos. Intenta nuevamente.';
        },
        complete: () => { this.validationsLoading = false; },
      });
    }

    // 2) Cargar selección actual
    this.isLoading = true;
    this.studentApi.getActivePeriodId$().subscribe((id) => {
      this.enroll.current(id || undefined).subscribe({
        next: (res) => {
          this.current = (res as EnrollmentCurrent) || null;
          const mod = this.current?.modality as Modality | undefined;
          this.uicSubmitted = mod === 'UIC';
          this.complexivoSelected = mod === 'EXAMEN_COMPLEXIVO';
          if (mod === 'UIC') this.activeTab = 'uic';
          if (mod === 'EXAMEN_COMPLEXIVO') this.activeTab = 'complexivo';
          // sincronizar sidebar
          if (mod === 'UIC' || mod === 'EXAMEN_COMPLEXIVO') this.modalitySvc.set(mod);
        },
        complete: () => { this.isLoading = false; }
      });
    });

    // 3) Cargar docentes para selector
    this.http.get<Array<{ id_user: number; fullname: string }>>('/api/uic/docentes').subscribe({
      next: (rows) => { this.docentes = Array.isArray(rows) ? rows : []; },
      error: () => { this.docentes = []; }
    });

    // 3.1) Cargar carreras para selector
    this.http.get<any[]>('/api/uic/carreras').subscribe({
      next: (rows) => {
        const list = Array.isArray(rows) ? rows : [];
        this.carreras = list.map(r => ({ id: Number(r.id), nombre: String(r.nombre) }))
          .filter(r => Number.isFinite(Number(r.id)) && !!r.nombre);

        if (!Number.isFinite(Number(this.selectedCareerId)) && this.uic.carrera) {
          const match = this.carreras.find(c => String(c.nombre) === String(this.uic.carrera));
          this.selectedCareerId = match ? Number(match.id) : null;
        }
      },
      error: () => { this.carreras = []; }
    });

    // 4) Cargar formulario UIC ya guardado (si existe)
    this.uicTopicLoading = true;
    this.http.get<any>('/api/uic/topic').subscribe({
      next: (row) => {
        if (!row) return;
        this.uicTopicId = Number(row?.id) || null;
        this.uic.tema = String(row?.topic || '');
        this.uic.carrera = String(row?.career || '');
        // Si ya cargó el catálogo, preseleccionar la carrera; si no, lo hará al cargar carreras
        if (this.carreras.length > 0) {
          const match = this.carreras.find(c => String(c.nombre) === String(this.uic.carrera));
          this.selectedCareerId = match ? Number(match.id) : null;
        }
        this.selectedTutorId = Number.isFinite(Number(row?.id_tutor)) ? Number(row.id_tutor) : null;

        // Si ya existe, bloquear edición (igual que cuando se envía)
        this.uicSubmitted = true;
      },
      complete: () => { this.uicTopicLoading = false; },
      error: () => { this.uicTopicLoading = false; }
    });
  }

  submitUIC() {
    this.uicAttempted = true;
    if (!this.canSubmitUIC) return;
    if (!this.canChooseModality) {
      this.toastMsg = this.validationsMsg || 'No puedes elegir modalidad aún.';
      this.showToast = true;
      setTimeout(() => { this.showToast = false; }, 4000);
      return;
    }
    this.isLoading = true;
    const careerName = this.carreras.find(c => Number(c.id) === Number(this.selectedCareerId))?.nombre || '';
    const payload = {
      career: careerName,
      topic: this.uic.tema,
      id_tutor: Number(this.selectedTutorId),
    };
    this.http.post<any>('/api/uic/topic', payload).subscribe({
      next: (saved) => {
        this.uicTopicId = Number(saved?.id) || this.uicTopicId;
        // Bloquear edición del formulario
        this.uicSubmitted = true;

        this.studentApi.getActivePeriodId$().subscribe((id) => {
          this.enroll.select('UIC', id || undefined).subscribe({
            next: () => {
              this.toastMsg = 'Has seleccionado la modalidad UIC. Pronto se habilitarán las opciones correspondientes.';
              this.showToast = true;
              setTimeout(() => { this.showToast = false; }, 4000);
              // refrescar selección actual
              this.enroll.current(id || undefined).subscribe((res) => {
                this.current = (res as EnrollmentCurrent) || null;
                const mod = this.current?.modality as Modality | undefined;
                this.uicSubmitted = mod === 'UIC' || this.uicSubmitted;
                this.complexivoSelected = mod === 'EXAMEN_COMPLEXIVO';
                this.preselectUIC = false;
                if (mod === 'UIC' || mod === 'EXAMEN_COMPLEXIVO') this.modalitySvc.set(mod);
              });
            },
            complete: () => { this.isLoading = false; }
          });
        });
      },
      error: () => {
        this.isLoading = false;
        this.toastMsg = 'No se pudo guardar el formulario UIC. Intenta nuevamente.';
        this.showToast = true;
        setTimeout(() => { this.showToast = false; }, 4000);
      }
    });
  }

  // Selección rápida de modalidad UIC: solo activa el formulario, no confirma selección
  chooseUIC() {
    if (this.isLoading || this.selectedModality || !this.canChooseModality) return;
    this.preselectUIC = true;
    this.activeTab = 'uic';
  }

  chooseComplexivo() {
    if (this.isLoading || this.selectedModality || !this.canChooseModality) return;
    this.isLoading = true;
    this.studentApi.getActivePeriodId$().subscribe((id) => {
      this.enroll.select('EXAMEN_COMPLEXIVO', id || undefined).subscribe({
        next: () => {
          this.toastMsg = 'Has seleccionado la modalidad de Examen Complexivo.';
          this.showToast = true;
          setTimeout(() => { this.showToast = false; }, 3000);
          this.enroll.current(id || undefined).subscribe((res) => {
            this.current = (res as EnrollmentCurrent) || null;
            const mod = this.current?.modality as Modality | undefined;
            this.uicSubmitted = mod === 'UIC';
            this.complexivoSelected = mod === 'EXAMEN_COMPLEXIVO';
            this.activeTab = 'complexivo';
            if (mod === 'UIC' || mod === 'EXAMEN_COMPLEXIVO') this.modalitySvc.set(mod);
          });
        },
        complete: () => { this.isLoading = false; }
      });
    });
  }

  elegirComplexivo() {
    if (!this.canChooseModality) {
      this.toastMsg = this.validationsMsg || 'No puedes elegir modalidad aún.';
      this.showToast = true;
      setTimeout(() => { this.showToast = false; }, 4000);
      return;
    }
    this.isLoading = true;
    this.studentApi.getActivePeriodId$().subscribe((id) => {
      this.enroll.select('EXAMEN_COMPLEXIVO', id || undefined).subscribe({
        next: () => {
          this.toastMsg = 'Has seleccionado la modalidad de Examen Complexivo. Se habilitarán las opciones correspondientes.';
          this.showToast = true;
          this.complexivoSelected = true;
          setTimeout(() => { this.showToast = false; }, 4000);
          // refrescar selección actual
          this.enroll.current(id || undefined).subscribe((res) => {
            this.current = (res as EnrollmentCurrent) || null;
            const mod = this.current?.modality as Modality | undefined;
            if (mod === 'UIC' || mod === 'EXAMEN_COMPLEXIVO') this.modalitySvc.set(mod);
          });
        },
        complete: () => { this.isLoading = false; }
      });
    });
  }
}
