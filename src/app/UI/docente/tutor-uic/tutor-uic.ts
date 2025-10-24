import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TutorAvanceService, FilaAvance, ParcialEstado } from '../../../core/services/tutor-avance.service';

@Component({
  selector: 'app-tutor-uic-docente',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tutor-uic.html',
  styleUrl: './tutor-uic.scss'
})
export class TutorUicDocente {
  tab: 'avance' = 'avance';
  estudiantes: FilaAvance[] = [];
  private tutorId = 't1'; // TODO: reemplazar por id desde AuthService/token

  constructor(private avanceSvc: TutorAvanceService) {
    this.avanceSvc.getListaTutor(this.tutorId).subscribe(lista => {
      this.estudiantes = lista;
    });
  }

  promedio(e: { p1: { nota: number|null }, p2: { nota: number|null }, p3: { nota: number|null } }): number | null {
    const vals = [e.p1.nota, e.p2.nota, e.p3.nota].filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.round(avg * 100) / 100;
  }

  clampNota(e: any, key: 'p1'|'p2'|'p3') {
    let v = e[key].nota;
    if (v === null || v === undefined || v === '') return;
    if (v < 0) e[key].nota = 0;
    if (v > 10) e[key].nota = 10;
  }

  private previoCompleto(e: any, key: 'p1'|'p2'|'p3'): boolean {
    if (key === 'p1') return true;
    if (key === 'p2') return e.p1.estado === 'published';
    if (key === 'p3') return e.p2.estado === 'published';
    return false;
  }

  puedeEditar(e: any, key: 'p1'|'p2'|'p3'): boolean {
    if (e.publicado) return false;
    if (!this.previoCompleto(e, key)) return false;
    return e[key].estado === 'editing';
  }

  puedeMostrarEditar(e: any, key: 'p1'|'p2'|'p3'): boolean {
    return !e.publicado && (e[key].estado === 'saved');
  }

  guardar(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    this.clampNota(e, key);
    this.avanceSvc.guardarParcial(this.tutorId, e.alumnoId, key, { nota: e[key].nota, obs: e[key].obs });
  }

  editar(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    if (e.publicado) return;
    e[key].estado = 'editing';
  }

  puedePublicar(e: FilaAvance, key: 'p1'|'p2'|'p3'): boolean {
    if (e.publicado) return false;
    if (!this.previoCompleto(e, key)) return false;
    return e[key].nota !== null && e[key].estado !== 'published';
  }

  publicarParcial(e: FilaAvance, key: 'p1'|'p2'|'p3') {
    if (!this.puedePublicar(e, key)) return;
    this.clampNota(e, key);
    // Guardar si estaba en edición y publicar vía servicio
    if (e[key].estado === 'editing') {
      this.avanceSvc.guardarParcial(this.tutorId, e.alumnoId, key, { nota: e[key].nota, obs: e[key].obs });
    }
    this.avanceSvc.publicarParcial(this.tutorId, e.alumnoId, key);
    // Nota: el stream actualizará la fila; las reglas de habilitado dependen de estado 'published' previo
  }
}
