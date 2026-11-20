import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MiGrupoInstructorDTO, MisCursosHorarioDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { motivoNombre } from 'src/app/Models/DTOs/novedad-clase-dto';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';
import { horariosDeHoy, normalizarDia } from 'src/app/shared/clases-hoy.util';
import { formatoHora12 } from 'src/app/shared/ventana-registro.util';

/**
 * Grupos que dirige un instructor, como tarjetas (presentación pura).
 * Destaca los grupos con clase hoy y los muestra primero; no conoce el rol, el Router ni los servicios.
 */
@Component({
  selector: 'app-tarjetas-grupos-instructor',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tarjetas-grupos-instructor.component.html',
  styleUrls: ['./tarjetas-grupos-instructor.component.css'],
})
export class TarjetasGruposInstructorComponent {
  @Input() grupos: MiGrupoInstructorDTO[] = [];
  @Input() cargando = false;
  @Input() mensajeVacio = 'No tienes grupos a cargo todavía.';
  /** Fecha de referencia para "hoy" (se puede fijar en pruebas). */
  @Input() hoy: Date = new Date();
  @Output() verGrupo = new EventEmitter<MiGrupoInstructorDTO>();

  /** Fecha de hoy como yyyy-MM-dd (la misma `hoy` con la que se decide qué grupos tienen clase). */
  private get fechaHoy(): string {
    const d = this.hoy;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** La clase de hoy fue marcada como no realizada: la novedad activa es de hoy. */
  claseNoRealizadaHoy(g: MiGrupoInstructorDTO): boolean {
    return !!g.novedadHoy && String(g.novedadHoy.fecha).substring(0, 10) === this.fechaHoy;
  }

  /** "Motivo: Condiciones climáticas" (con la descripción si la hay). */
  textoNovedad(g: MiGrupoInstructorDTO): string {
    const n = g.novedadHoy;
    if (!n) return '';
    const descripcion = n.descripcion?.trim();
    return `Motivo: ${motivoNombre(n.motivo)}${descripcion ? ` · ${descripcion}` : ''}`;
  }

  /** Hay clase hoy y se va a dictar: es la única que invita a registrar asistencia. */
  claseHoyActiva(g: MiGrupoInstructorDTO): boolean {
    return this.clasesHoy(g).length > 0 && !this.claseNoRealizadaHoy(g);
  }

  /** Primero los grupos con clase hoy; el resto conserva el orden alfabético por curso. */
  get gruposOrdenados(): MiGrupoInstructorDTO[] {
    return [...this.grupos].sort((a, b) => {
      const ha = this.claseHoyActiva(a) ? 0 : 1;
      const hb = this.claseHoyActiva(b) ? 0 : 1;
      return ha - hb || a.curso.localeCompare(b.curso, 'es') || a.iterable - b.iterable;
    });
  }

  clasesHoy(g: MiGrupoInstructorDTO): MisCursosHorarioDTO[] {
    return horariosDeHoy(g.horarios, this.hoy);
  }

  esDeHoy(g: MiGrupoInstructorDTO, h: MisCursosHorarioDTO): boolean {
    return this.clasesHoy(g).some(x => x.id === h.id && normalizarDia(x.dia) === normalizarDia(h.dia));
  }

  /** "6:00 p. m. – 8:00 p. m." de la primera clase de hoy. */
  textoHoy(g: MiGrupoInstructorDTO): string {
    const clases = this.clasesHoy(g);
    return clases.length ? this.franja(clases[0]) : '';
  }

  franja(h: MisCursosHorarioDTO): string {
    return `${formatoHora12(h.horaInicio)} – ${formatoHora12(h.horaFin)}`;
  }

  nombreGrupo(g: MiGrupoInstructorDTO): string {
    return `Grupo ${letraDeIterable(g.iterable)}`;
  }

  periodo(g: MiGrupoInstructorDTO): string {
    return `${g.anio}-${g.periodo}`;
  }

  inscripcionesAbiertas(g: MiGrupoInstructorDTO): boolean {
    return g.estadoInscripciones === 'ABIERTO';
  }

  porcentaje(g: MiGrupoInstructorDTO): number {
    if (!g.cupos) return 0;
    return Math.min(100, Math.round((g.inscritos * 100) / g.cupos));
  }

  textoCupos(g: MiGrupoInstructorDTO): string {
    return g.cupos == null ? `${g.inscritos} inscritos · sin cupos definidos` : `${g.inscritos} de ${g.cupos} cupos`;
  }

  /** Nombre accesible del botón: dice a qué grupo lleva. */
  etiquetaBoton(g: MiGrupoInstructorDTO): string {
    const accion = this.claseHoyActiva(g) ? 'Registrar asistencia de hoy' : 'Ver grupo';
    const aviso = this.claseNoRealizadaHoy(g) ? ' (clase de hoy no realizada)' : '';
    return `${accion}: ${g.curso}, ${this.periodo(g)} ${this.nombreGrupo(g)}${aviso}`;
  }
}
