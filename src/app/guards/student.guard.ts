import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, catchError, of, take } from 'rxjs';
import { MeService } from '../services/me.service';

export const StudentGuard: CanActivateFn = () => {
  const me = inject(MeService);
  const router = inject(Router);
  return me.getProfile().pipe(
    take(1),
    map(() => true),
    catchError(() => of(true))
  );
};
