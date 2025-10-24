import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PeriodService } from '../../services/period.service';

@Component({
  selector: 'app-vinculacion-practicas-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class VinculacionPracticasLayout {
  userName = 'Usuario Vinculación';
  userRole = 'Vinculación y Prácticas';
  userInitials = 'VP';
  isProfileOpen = false;
  // Período activo global
  activePeriod: string | null = null;
  periodOptions: string[] = [
    'PERIODO SEPTIEMBRE 2025 – DICIEMBRE 2025',
    'PERIODO ENERO 2026 – ABRIL 2026',
    'PERIODO MAYO 2026 – AGOSTO 2026'
  ];

  constructor(private periodSvc: PeriodService) {
    this.activePeriod = this.periodSvc.getActivePeriod();
    this.periodSvc.activePeriod$.subscribe(p => this.activePeriod = p);
  }

  toggleProfile() { this.isProfileOpen = !this.isProfileOpen; }
  logout() { console.log('Logout Vinculación/Prácticas'); }
  onChangePeriod(p: string) { this.periodSvc.setActivePeriod(p); }
}
