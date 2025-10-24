import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Services
import { AuthService, LoginResponse } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  showPassword = false; // Cambiado de hidePassword a showPassword
  isLoading = false;
  error = '';
  showToast = false; // Para controlar el toast personalizado

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    // Quitar MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]] // Aumentar a 8 caracteres
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/estudiante']);
    }
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
        // Mostrar toast de éxito
        this.showToast = true;
        setTimeout(() => {
          this.showToast = false;
          this.router.navigate(['/estudiante']);
        }, 2000); // Redirigir después de 2 segundos
      },
      error: (error: any) => {
        this.isLoading = false;
        this.error = 'Credenciales incorrectas. Por favor, verifique su correo y contraseña.';
        
        // Shake animation for error
        const formPanel = document.querySelector('.form-panel');
        if (formPanel) {
          formPanel.classList.add('shake');
          setTimeout(() => formPanel.classList.remove('shake'), 500);
        }
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  showPasswordRecovery(): void {
    alert('Por favor, contacta al departamento de soporte académico para restablecer tu contraseña.');
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