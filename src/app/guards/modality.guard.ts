import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ModalityService } from '../services/modality.service';

export const UICOnlyGuard: CanActivateFn = () => {
  const modSvc = inject(ModalityService);
  const router = inject(Router);
  const mod = modSvc.value;
  if (mod === 'UIC') return true;
  modSvc.refresh();
  return router.createUrlTree(['/estudiante/gestion-modalidad']);
};

export const ComplexivoOnlyGuard: CanActivateFn = () => {
  const modSvc = inject(ModalityService);
  const router = inject(Router);
  const mod = modSvc.value;
  if (mod === 'EXAMEN_COMPLEXIVO') return true;
  modSvc.refresh();
  return router.createUrlTree(['/estudiante/gestion-modalidad']);
};
