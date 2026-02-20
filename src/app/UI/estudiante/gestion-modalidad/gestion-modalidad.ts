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
import { VouchersService } from '../../../services/vouchers.service';
import { AuthService } from '../../../services/auth.service';

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

  careerLoading = false;
  careerLocked = true;

  assignedTutorId: number | null = null;
  assignedTutorNombre: string | null = null;

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
    const temaOk = this.isTemaValido(this.uic.tema);
    return !!(
      temaOk &&
      Number.isFinite(Number(this.selectedCareerId)) &&
      Number.isFinite(Number(this.selectedTutorId))
    );
  }

  private isTemaValido(v: string): boolean {
    const tema = String(v || '').trim();
    if (!tema) return false;
    // Debe tener al menos una letra
    const hasLetter = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(tema);
    if (!hasLetter) return false;
    // Permitir letras, números, espacios y puntuación común en títulos
    const allowed = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 ,.;:()¿?¡!"'“”\-–—/]+$/.test(tema);
    if (!allowed) return false;
    // Evitar temas demasiado cortos
    if (tema.length < 8) return false;
    return true;
  }

  constructor(
    private enroll: EnrollmentsService,
    private studentApi: StudentApiService,
    private me: MeService,
    private modalitySvc: ModalityService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private documents: DocumentsService,
    private vouchers: VouchersService,
    private auth: AuthService,
  ) { }

  ngOnInit() {
    const bypass = String(this.route.snapshot.queryParamMap.get('bypassValidations') || '').toLowerCase();
    this.bypassValidations = bypass === '1' || bypass === 'true' || bypass === 'yes';

    // 0) Cargar carrera del estudiante (solo lectura)
    this.careerLoading = true;
    this.http.get<{ career_id: number | null; career_name: string | null }>('/api/enrollments/career').subscribe({
      next: (row) => {
        const cid = Number(row?.career_id);
        const cname = row?.career_name != null ? String(row.career_name) : '';
        if (Number.isFinite(cid)) this.selectedCareerId = cid;
        if (cname) this.uic.carrera = cname;
      },
      error: () => { /* no bloquear */ },
      complete: () => { this.careerLoading = false; }
    });

    // 1) Validaciones (Pagos aprobados + Requisitos aprobados) => gating
    if (this.bypassValidations) {
      this.validationsLoading = false;
      this.canChooseModality = true;
      this.validationsMsg = '';
    } else {
      this.validationsLoading = true;
      const user = this.auth.currentUserValue;
      const id_user = user?.id_user;
      if (!id_user) {
        this.canChooseModality = false;
        this.validationsMsg = 'No se pudo verificar tu usuario. Intenta nuevamente.';
        this.validationsLoading = false;
      } else {
        // A) Pagos aprobados
        this.vouchers.list({ id_user: Number(id_user), status: 'aprobado', page: 1, pageSize: 1 }).subscribe({
          next: (vres: any) => {
            const vdata = Array.isArray(vres?.data) ? vres.data : (Array.isArray(vres) ? vres : []);
            const pagosAprobados = vdata.length > 0;

            // B) Requisitos de matrícula aprobados
            this.documents.list({ category: 'matricula', page: 1, pageSize: 200 }).subscribe({
              next: (res: any) => {
                const raw = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
                const docs = raw.map((d: any) => ({
                  ...d,
                  estado: d?.status ?? d?.estado ?? 'en_revision',
                }));
                const hasAny = docs.length > 0;
                const requisitosAprobados = hasAny && docs.every((d: any) => String(d.estado || '').toLowerCase() === 'aprobado');

                const ok = pagosAprobados && requisitosAprobados;
                this.canChooseModality = ok;
                this.validationsMsg = ok
                  ? ''
                  : (!pagosAprobados
                      ? 'Debes tener aprobados tus pagos para habilitar Gestión de Modalidad.'
                      : 'Debes tener aprobados los requisitos de Matrícula para elegir tu modalidad.');
              },
              error: () => {
                this.canChooseModality = false;
                this.validationsMsg = 'No se pudo verificar tus requisitos. Intenta nuevamente.';
              },
              complete: () => { this.validationsLoading = false; },
            });
          },
          error: () => {
            this.canChooseModality = false;
            this.validationsMsg = 'No se pudo verificar el estado de tus pagos. Intenta nuevamente.';
            this.validationsLoading = false;
          },
        });
      }
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

        // Si no se pudo resolver por /enrollments/career, intentar mapear por nombre desde topic
        if (!Number.isFinite(Number(this.selectedCareerId)) && this.uic.carrera) {
          const match = this.carreras.find(c => String(c.nombre) === String(this.uic.carrera));
          this.selectedCareerId = match ? Number(match.id) : null;
        }

        // Si se resolvió id pero no nombre, resolver nombre del catálogo
        if (Number.isFinite(Number(this.selectedCareerId)) && !this.uic.carrera) {
          const name = this.carreras.find(c => Number(c.id) === Number(this.selectedCareerId))?.nombre;
          if (name) this.uic.carrera = name;
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

    // 5) Si ya está en UIC, usar el tutor asignado (si difiere del elegido en el topic)
    // Nota: este endpoint está protegido por requireModality('UIC')
    this.studentApi.getActivePeriodId$().subscribe((id) => {
      this.enroll.current(id || undefined).subscribe({
        next: (res) => {
          const mod = (res as EnrollmentCurrent)?.modality as Modality | undefined;
          if (mod !== 'UIC') return;
          this.http.get<any>('/api/uic/estudiante/avance').subscribe({
            next: (av) => {
              const tid = Number(av?.tutorId);
              const tname = av?.tutorNombre != null ? String(av.tutorNombre) : null;
              if (Number.isFinite(tid)) {
                this.assignedTutorId = tid;
                this.assignedTutorNombre = tname;
                this.selectedTutorId = tid;
              }
            },
            error: () => { /* ignore */ }
          });
        },
        error: () => { /* ignore */ }
      });
    });
  }

  submitUIC() {
    this.uicAttempted = true;
    if (!this.isTemaValido(this.uic.tema)) return;
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
