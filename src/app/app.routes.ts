import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { AuthGuard, NoAuthGuard } from './guards/auth.guard';
import { StudentGuard } from './guards/student.guard';
import { EstudianteLayout } from './UI/estudiante/layout';
import { Inicio } from './UI/estudiante/inicio/inicio';
import { Matricula } from './UI/estudiante/matricula/matricula';
import { GestionModalidad } from './UI/estudiante/gestion-modalidad/gestion-modalidad';
import { CronogramaUic } from './UI/estudiante/cronograma-uic/cronograma-uic';
import { AvanceUic } from './UI/estudiante/avance-uic/avance-uic';
import { Pagos as EstPagos } from './UI/estudiante/pagos/pagos';
import { CronogramaExamenComplexivo } from './UI/estudiante/cronograma-examen-complexivo/cronograma-examen-complexivo';
import { Tutorias } from './UI/estudiante/tutorias/tutorias';
import { UICOnlyGuard, ComplexivoOnlyGuard } from './guards/modality.guard';
import { CoordinadorLayout } from './UI/coordinador/layout';
import { Inicio as CoordInicio } from './UI/coordinador/inicio/inicio';
import { CronogramaUic as CoordCronogramaUic } from './UI/coordinador/cronograma-uic/cronograma-uic';
import { CronogramaExamenComplexivo as CoordCronogramaExamenComplexivo } from './UI/coordinador/cronograma-examen-complexivo/cronograma-examen-complexivo';
import { Reportes } from './UI/coordinador/reportes/reportes';
import { TribunalEvaluador } from './UI/coordinador/tribunal-evaluador/tribunal-evaluador';
import { VeedorExamenComplexivo } from './UI/coordinador/veedor-examen-complexivo/veedor-examen-complexivo';
import { ComisionAsignarTutorComponent } from './UI/coordinador/comision-asignar-tutor/asignar-tutor';
import { ComisionAsignarLectorComponent } from './UI/coordinador/comision-asignar-lector/asignar-lector';
import { TesoreriaLayout } from './UI/tesoreria/layout';
import { Inicio as TesInicio } from './UI/tesoreria/inicio/inicio';
import { Aranceles } from './UI/tesoreria/aranceles/aranceles';
import { Pagos } from './UI/tesoreria/pagos/pagos';
import { Reportes as TesReportes } from './UI/tesoreria/reportes/reportes';
import { SecretariaLayout } from './UI/secretaria/layout';
import { Inicio as SecInicio } from './UI/secretaria/inicio/inicio';
import { NotaEstudiantes } from './UI/secretaria/nota-estudiantes/nota-estudiantes';
import { Matricula as SecMatricula } from './UI/secretaria/matricula/matricula';
import { ActasGrado } from './UI/secretaria/actas-grado/actas-grado';
import { Reportes as SecReportes } from './UI/secretaria/reportes/reportes';
import { VicerrectorLayout } from './UI/vicerrector/layout';
import { Inicio as VicInicio } from './UI/vicerrector/inicio/inicio';
import { GestionExamenes } from './UI/vicerrector/gestion-examenes/gestion-examenes';
import { Reportes as VicReportes } from './UI/vicerrector/reportes/reportes';
import { DocenteLayout } from './UI/docente/layout';
import { Inicio as DocInicio } from './UI/docente/inicio/inicio';
import { TutorUicDocente } from './UI/docente/tutor-uic/tutor-uic';
import { DocenteComplexivo } from './UI/docente/docente-complexivo/docente-complexivo';
import { LectorDocente } from './UI/docente/lector/lector';
import { VeedorDocente } from './UI/docente/veedor/veedor';
import { TribunalEvaluadorDocente } from './UI/docente/tribunal-evaluador/tribunal-evaluador';
import { AdministradorLayout } from './UI/administrador/layout';
import { Inicio as AdminInicio } from './UI/administrador/inicio/inicio';
import { GestionPeriodos } from './UI/administrador/gestion-periodos/gestion-periodos';
import { Reportes as AdminReportes } from './UI/administrador/reportes/reportes';
import { AdminIngles } from './UI/administrador/administracion/ingles/ingles';
import { AdminVinculacionPracticas } from './UI/administrador/administracion/vinculacion-practicas/vinculacion-practicas';
import { InglesLayout } from './UI/ingles/layout';
import { Inicio as InglesInicio } from './UI/ingles/inicio/inicio';
import { Calificacion as InglesCalificacion } from './UI/ingles/calificacion/calificacion';
import { VinculacionPracticasLayout } from './UI/vinculacion_practicas/layout';
import { Inicio as VPInicio } from './UI/vinculacion_practicas/inicio/inicio';
import { Calificacion as VPCalificacion } from './UI/vinculacion_practicas/vinculacion/calificacion/calificacion';
import { CalificacionPracticas as VPPracticasCalificacion } from './UI/vinculacion_practicas/practicas_pre_profesionales/calificacion/calificacion';
import { UnauthorizedComponent } from './auth/unauthorized/unauthorized';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [NoAuthGuard]
  },
  {
    path: 'ingles',
    component: InglesLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Ingles'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: InglesInicio },
      { path: 'calificacion', component: InglesCalificacion },
    ]
  },
  {
    path: 'vinculacion-practicas',
    component: VinculacionPracticasLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Vinculacion_Practicas'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: VPInicio },
      { path: 'vinculacion', component: VPCalificacion },
      { path: 'practicas-pre-profesionales', component: VPPracticasCalificacion },
    ]
  },
  {
    path: 'administrador',
    component: AdministradorLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Administrador'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: AdminInicio },
      { path: 'gestion-periodos', component: GestionPeriodos },
      { path: 'reportes', component: AdminReportes },
      { path: 'administracion', redirectTo: 'administracion/ingles', pathMatch: 'full' },
      { path: 'administracion/ingles', component: AdminIngles },
      { path: 'administracion/vinculacion-practicas', component: AdminVinculacionPracticas },
    ]
  },
  {
    path: 'docente',
    component: DocenteLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Docente'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: DocInicio },
      { path: 'tutor-uic', redirectTo: 'tutor-uic/avance', pathMatch: 'full' },
      { path: 'tutor-uic/avance', component: TutorUicDocente },
      { path: 'docente-complexivo', redirectTo: 'docente-complexivo/mis-materias', pathMatch: 'full' },
      { path: 'docente-complexivo/mis-materias', component: DocenteComplexivo },
      { path: 'docente-complexivo/estudiantes', component: DocenteComplexivo },
      { path: 'lector', component: LectorDocente },
      { path: 'veedor', component: VeedorDocente },
      { path: 'tribunal-evaluador', component: TribunalEvaluadorDocente },
    ]
  },
  {
    path: 'tesoreria',
    component: TesoreriaLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Tesoreria'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: TesInicio },
      { path: 'aranceles', component: Aranceles },
      { path: 'pagos', component: Pagos },
      { path: 'reportes', component: TesReportes },
    ]
  },
  {
    path: 'estudiante',
    component: EstudianteLayout,
    canActivate: [AuthGuard, StudentGuard],
    data: { roles: ['Estudiante'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: Inicio },
      { path: 'matriculacion', component: Matricula },
      { path: 'pagos', component: EstPagos },
      { path: 'gestion-modalidad', component: GestionModalidad },
      { path: 'cronograma-uic', component: CronogramaUic },
      { path: 'avance', component: AvanceUic },
      { path: 'cronograma-complexivo', component: CronogramaExamenComplexivo },
      { path: 'tutorias', component: Tutorias },
    ]
  },
  {
    path: 'coordinador',
    component: CoordinadorLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Coordinador'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: CoordInicio },
      { path: 'cronogramas/uic', component: CoordCronogramaUic },
      { path: 'cronogramas/complexivo', component: CoordCronogramaExamenComplexivo },
      { path: 'comision/tribunal-evaluador', component: TribunalEvaluador },
      { path: 'comision/veedores', component: VeedorExamenComplexivo },
      { path: 'comision/asignar-tutor', component: ComisionAsignarTutorComponent },
      { path: 'comision/asignar-lector', component: ComisionAsignarLectorComponent },
      { path: 'reportes', component: Reportes },
    ]
  },
  {
    path: 'vicerrector',
    component: VicerrectorLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Vicerrector'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: VicInicio },
      { path: 'gestion-examenes', component: GestionExamenes },
      { path: 'reportes', component: VicReportes },
    ]
  },
  {
    path: 'secretaria',
    component: SecretariaLayout,
    canActivate: [AuthGuard],
    data: { roles: ['Secretaria'] },
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      { path: 'inicio', component: SecInicio },
      { path: 'nota-estudiantes', component: NotaEstudiantes },
      { path: 'matricula', component: SecMatricula },
      { path: 'acta-grado', component: ActasGrado },
      { path: 'reportes', component: SecReportes },
    ]
  },
  { 
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  { 
    path: '**', 
    redirectTo: 'login'
  }
];
