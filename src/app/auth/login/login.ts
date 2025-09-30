import { Component, OnInit } from '@angular/core';
import { LoginResponse } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// PrimeNG Modules
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DividerModule } from 'primeng/divider';

// Services
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    DividerModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  hidePassword = true;
  isLoading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }

    // Añadir animación de entrada
    setTimeout(() => {
      const loginCard = document.querySelector('.login-card');
      if (loginCard) {
        loginCard.classList.add('loaded');
      }
    }, 100);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Bienvenido', 
          detail: 'Inicio de sesión exitoso',
          life: 2000
        });
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (error: any) => {
        this.isLoading = false;
        this.error = 'Credenciales incorrectas. Por favor, verifique su correo y contraseña.';
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error de autenticación', 
          detail: this.error,
          life: 5000
        });
        
        // Shake animation for error
        const formPanel = document.querySelector('.form-panel');
        if (formPanel) {
          formPanel.classList.add('shake');
          setTimeout(() => formPanel.classList.remove('shake'), 500);
        }
      }
    });
  }

  showPasswordRecovery(): void {
    this.messageService.add({
      severity: 'info',
      summary: 'Recuperación de contraseña',
      detail: 'Por favor, contacta al departamento de soporte académico para restablecer tu contraseña.',
      life: 4000,
      styleClass: 'toast-recovery'
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}