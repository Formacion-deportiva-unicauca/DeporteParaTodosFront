import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilaMisCursos, MisCursosHorarioDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';
import { horariosDeHoy, normalizarDia } from 'src/app/shared/clases-hoy.util';
import { formatoHora12 } from 'src/app/shared/ventana-registro.util';
import { nombreDia, nombrePropio } from 'src/app/shared/texto-nombre.util';

/**
 * Cursos de una persona inscrita (Estudiante, Docente, Administrativo o Contratista) como tarjetas.
 * Presentación pura: destaca las clases de hoy y avisa por @Output; no conoce el Router ni los servicios.
 */
@Component({
  selector: 'app-tarjetas-cursos-alumno',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tarjetas-cursos-alumno.component.html',
  styleUrls: ['./tarjetas-cursos-alumno.component.css'],
})
export class TarjetasCursosAlumnoComponent {
  @Input() cursos: FilaMisCursos[] = [];
  @Input() cargando = false;
  /** Fecha de referencia para "hoy" (se puede fijar en pruebas). */
  @Input() hoy: Date = new Date();
  @Output() verGrupo = new EventEmitter<FilaMisCursos>();
  @Output() explorar = new EventEmitter<void>();

  /** Los datos llegan en mayúsculas o minúsculas sueltas: se presentan como nombre propio. */
  readonly nombrePropio = nombrePropio;
  readonly nombreDia = nombreDia;

  /** Primero lo que tiene clase hoy, luego lo inscrito, luego la lista de espera y al final lo que ya no está disponible. */
  get cursosOrdenados(): FilaMisCursos[] {
    return [...this.cursos].sort((a, b) =>
      this.prioridad(a) - this.prioridad(b) || a.curso.localeCompare(b.curso, 'es') || a.iterable - b.iterable);
  }

  private prioridad(c: FilaMisCursos): number {
    if (!c.grupoActivo) return 3;
    if (c.estado === 'EN_ESPERA') return 2;
    return this.clasesHoy(c).length > 0 ? 0 : 1;
  }

  clasesHoy(c: FilaMisCursos): MisCursosHorarioDTO[] {
    return c.grupoActivo && c.estado === 'INSCRITO' ? horariosDeHoy(c.horarios, this.hoy) : [];
  }

  esDeHoy(c: FilaMisCursos, h: MisCursosHorarioDTO): boolean {
    return this.clasesHoy(c).some(x => x.id === h.id && normalizarDia(x.dia) === normalizarDia(h.dia));
  }

  textoHoy(c: FilaMisCursos): string {
    const clases = this.clasesHoy(c);
    return clases.length ? this.franja(clases[0]) : '';
  }

  franja(h: MisCursosHorarioDTO): string {
    return `${formatoHora12(h.horaInicio)} – ${formatoHora12(h.horaFin)}`;
  }

  periodo(c: FilaMisCursos): string {
    return `${c.anio}-${c.periodo}`;
  }

  nombreGrupo(c: FilaMisCursos): string {
    return `Grupo ${letraDeIterable(c.iterable)}`;
  }

  /** "Katerinn Natalia Arcos Daza" → "KN" */
  iniciales(nombre: string | null): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  /** Nombre accesible del botón: dice a qué grupo lleva. */
  etiquetaBoton(c: FilaMisCursos): string {
    return `Ver grupo: ${nombrePropio(c.curso)}, ${this.periodo(c)} ${this.nombreGrupo(c)}`;
  }
}
