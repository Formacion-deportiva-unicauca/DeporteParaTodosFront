import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MiGrupoInstructorDTO, MisCursosHorarioDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';

/**
 * Tabla de grupos que dirige un instructor (presentación pura).
 * No conoce el rol, el Router ni los servicios: recibe los datos por @Input y avisa por @Output.
 */
@Component({
  selector: 'app-tabla-grupos-instructor',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressSpinnerModule],
  templateUrl: './tabla-grupos-instructor.component.html',
  styleUrls: ['./tabla-grupos-instructor.component.css'],
})
export class TablaGruposInstructorComponent {
  @Input() grupos: MiGrupoInstructorDTO[] = [];
  @Input() cargando = false;
  @Input() mensajeVacio = 'No tienes grupos a cargo todavía.';
  @Output() verDeportistas = new EventEmitter<MiGrupoInstructorDTO>();

  displayedColumns: string[] = ['curso', 'categoria', 'grupo', 'horario', 'cupos', 'estadoCurso', 'inscripciones', 'acciones'];

  formatGrupo(g: MiGrupoInstructorDTO): string {
    return `${g.anio}-${g.periodo} · Grupo ${letraDeIterable(g.iterable)}`;
  }

  formatHorario(horarios: MisCursosHorarioDTO[]): string {
    if (!horarios || horarios.length === 0) return 'Horario por definir';
    return horarios
      .map(h => {
        const esc = h.escenario ? ` ${h.escenario}` : '';
        return `${h.dia} ${h.horaInicio} - ${h.horaFin}${esc}`;
      })
      .join(', ');
  }

  formatCupos(g: MiGrupoInstructorDTO): string {
    const base = g.cupos == null ? 'Sin cupos definidos' : `${g.inscritos} / ${g.cupos}`;
    return g.enEspera > 0 ? `${base} · ${g.enEspera} en espera` : base;
  }
}
