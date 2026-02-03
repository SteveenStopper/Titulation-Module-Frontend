import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized.html',
})
export class UnauthorizedComponent {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  goToLogin(): void {
    this.authService.logout(false);
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}

