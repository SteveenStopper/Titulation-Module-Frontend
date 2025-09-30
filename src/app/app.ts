import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet,
    HttpClientModule
  ],
  template: `
    <!-- Main application template with router outlet -->
    <router-outlet></router-outlet>
  `,
  styles: [`
    :root {
      --primary: #3f51b5;
      --accent: #ff4081;
      --warn: #f44336;
      --gray-400: #9e9e9e;
      --gray-900: #212121;
      --gray-700: #616161;
    }
    
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Roboto', sans-serif;
      line-height: 1.5;
      color: var(--gray-900);
      background-color: #f5f5f5;
    }
  `]
})
export class App {
  title = 'Sistema de Gestión de Titulación';
}
