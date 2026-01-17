import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormsModule, 
  ReactiveFormsModule, 
  FormBuilder, 
  FormGroup, 
  Validators, 
  FormControl,
  AbstractControl
} from '@angular/forms';
import { 
  Router, 
  RouterModule, 
  ActivatedRoute,
  Params 
} from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
export class LoginComponent implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;
  error = '';
  showToast = false;
  showErrorToast = false;
  errorToastMessage = '';
  private destroy$ = new Subject<void>();
  private returnUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Inicializar el formulario con validaciones
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required, 
        Validators.email,
        Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
      ]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8)
      ]]
    });
  }

  ngOnInit(): void {
    // Obtener la URL de retorno si existe
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params: Params) => {
        this.returnUrl = params['returnUrl'] || null;
      });

    // Si ya está autenticado, redirigir según su rol
    if (this.authService.isAuthenticated()) {
      this.redirectBasedOnRole();
      return;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Getters para acceder fácilmente a los controles del formulario
  get email(): AbstractControl | null { 
    return this.loginForm.get('email'); 
  }
  
  get password(): AbstractControl | null { 
    return this.loginForm.get('password'); 
  }

  onSubmit(): void {
    // Marcar todos los controles como touched para mostrar errores
    this.markFormGroupTouched();
    
    if (this.loginForm.invalid) {
      // Determinar qué campo está incorrecto y mostrar toast
      let campo = '';
      if (this.email?.invalid) campo = 'correo electrónico';
      else if (this.password?.invalid) campo = 'contraseña';
      if (campo) {
        this.errorToastMessage = `campo ${campo} incorrecto`;
        this.showErrorToast = true;
        setTimeout(() => { this.showErrorToast = false; }, 3000);
      }
      this.triggerShakeAnimation();
      return;
    }

    this.isLoading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;
        this.showToast = false;
        // Navegación inmediata basada en el rol devuelto por el backend
        const roles: string[] = response?.user?.roles || [];
        let target = this.returnUrl || '';
        if (!target) {
          if (roles.includes('Administrador')) target = '/administrador/inicio';
          else if (roles.includes('Estudiante')) target = '/estudiante';
          else if (roles.includes('Coordinador')) target = '/coordinador/inicio';
          else if (roles.includes('Docente')) target = '/docente/inicio';
          else if (roles.includes('Tesoreria')) target = '/tesoreria/inicio';
          else if (roles.includes('Secretaria')) target = '/secretaria/inicio';
          else if (roles.includes('Vicerrector')) target = '/vicerrector/inicio';
          else if (roles.includes('Ingles')) target = '/ingles/inicio';
          else if (roles.includes('Vinculacion_Practicas')) target = '/vinculacion_practicas/inicio';
          else target = '/login';
        }
        this.router.navigateByUrl(target, { replaceUrl: true });
      },
      error: (error: any) => {
        this.isLoading = false;
        this.handleLoginError(error);
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  showPasswordRecovery(): void {
    // Implementar lógica de recuperación de contraseña
    this.router.navigate(['/auth/forgot-password']);
  }

  private redirectAfterLogin(): void {
    if (this.returnUrl) {
      // Si hay una URL de retorno, redirigir a ella
      this.router.navigateByUrl(this.returnUrl, { replaceUrl: true });
    } else {
      // Si no, redirigir según el rol
      this.redirectBasedOnRole();
    }
  }

  private redirectBasedOnRole(): void {
    const defaultRoute = this.authService.getDefaultRoute();
    this.router.navigateByUrl(defaultRoute, { replaceUrl: true });
  }

  private handleLoginError(error: any): void {
    // Manejar diferentes tipos de errores
    if (error.status === 401) {
      this.error = 'Credenciales incorrectas. Por favor, verifique su correo y contraseña.';
      // Limpiar campos únicamente para credenciales incorrectas
      this.loginForm.reset({ email: '', password: '' });
      this.loginForm.markAsPristine();
      this.loginForm.markAsUntouched();
      // Toast específico
      this.errorToastMessage = 'credenciales incorrectas';
      this.showErrorToast = true;
      setTimeout(() => { this.showErrorToast = false; }, 3000);
    } else if (error.status === 0) {
      this.error = 'No se pudo conectar con el servidor. Verifique su conexión a internet e intente nuevamente.';
    } else if (error.status === 403) {
      this.error = 'Su cuenta no tiene permisos para acceder al sistema. Contacte al administrador.';
    } else if (error.status && error.status >= 500) {
      this.error = 'Error del servidor. Por favor, intente más tarde.';
    } else {
      this.error = error.error?.message || 'Credenciales incorrectas.';
    }
    
    // Animación de error
    this.triggerShakeAnimation();
    // Para otros errores distintos de 401, mostrar toast genérico con el mensaje calculado
    if (error.status !== 401) {
      this.errorToastMessage = this.error.toLowerCase();
      this.showErrorToast = true;
      setTimeout(() => { this.showErrorToast = false; }, 3000);
    }
  }

  private triggerShakeAnimation(): void {
    const formPanel = document.querySelector('.form-panel');
    if (formPanel) {
      formPanel.classList.add('shake');
      setTimeout(() => formPanel.classList.remove('shake'), 500);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup = this.loginForm): void {
    Object.keys(formGroup.controls).forEach((key: string) => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
        control.updateValueAndValidity();
      }
    });
  }

  // Métodos para mensajes de error del formulario
  getEmailErrorMessage(): string {
    if (this.email?.hasError('required')) {
      return 'El correo electrónico es obligatorio';
    }
    if (this.email?.hasError('email') || this.email?.hasError('pattern')) {
      return 'Por favor ingrese un correo electrónico válido';
    }
    return '';
  }

  getPasswordErrorMessage(): string {
    if (this.password?.hasError('required')) {
      return 'La contraseña es obligatoria';
    }
    if (this.password?.hasError('minlength')) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (this.password?.hasError('pattern')) {
      return 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número';
    }
    return '';
  }
}