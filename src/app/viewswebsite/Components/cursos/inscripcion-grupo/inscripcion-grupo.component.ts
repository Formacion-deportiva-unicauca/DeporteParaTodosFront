import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { HorarioService } from 'src/app/services/horario.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { InscripcionDTO } from 'src/app/Models/DTOs/inscripcion-dto';
import { DisponibilidadDTO } from 'src/app/Models/DTOs/disponibilidad-dto';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { puedeInscribirse as puedeInscribirseUtil } from 'src/app/shared/puede-inscribirse';
import { avisoInscripcionGrupo, inscripcionesAbiertasDeGrupo, textoVentanaInscripcion } from 'src/app/shared/fecha-grupo.util';
import { nombreDia, nombrePropio } from 'src/app/shared/texto-nombre.util';
import { formatoHora12 } from 'src/app/shared/ventana-registro.util';

/** Las notificaciones que confirman una inscripción duran más que las comunes: son el resultado de lo que la persona vino a hacer. */
const DURACION_RESULTADO_MS = 8000;

@Component({
  selector: 'app-inscripcion-grupo',
  standalone: true,
  imports: [CommonModule, SidenavComponent, MatButtonModule, MatIconModule, MatSnackBarModule],
  providers: [DatePipe],
  templateUrl: './inscripcion-grupo.component.html',
  styleUrls: ['./inscripcion-grupo.component.css'],
})
export class InscripcionGrupoComponent implements OnInit {
  categoria: string = '';
  curso: string = '';
  anio: number = 0;
  iterable: number = 0;

  grupo: GrupoDTO | null = null;
  cursoInfo: CursoDTO | null = null;
  horarios: HorarioDTO[] = [];
  disponibilidad: DisponibilidadDTO | null = null;
  cargando = true;
  inscribiendo = false;
  cancelando = false;
  yaInscrito = false;
  yaEnEspera = false;
  /** Posición en la lista de espera: se conoce al unirse (al volver a entrar solo se sabe que está en espera). */
  posicionEspera: number | null = null;
  /** Pregunta "¿seguro?" antes de cancelar: cancelar la inscripción o salir de la lista de espera pierde el cupo o la posición. */
  confirmandoCancelacion = false;
  /** Resultado de la última cancelación: queda en pantalla (la notificación desaparece sola). */
  canceladoReciente: { titulo: string; mensaje: string } | null = null;

  readonly nombrePropio = nombrePropio;
  readonly nombreDia = nombreDia;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private grupoService: GrupoService,
    private inscripcionesService: InscripcionesService,
    private horarioService: HorarioService,
    private instructorService: InstructorServisce,
    private cursodeportivoService: CursodeportivoService,
    private notificaciones: NotificacionService,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.categoria = params.get('categoria') ?? '';
      this.curso     = params.get('curso') ?? '';
      this.anio      = Number(params.get('anio'));
      this.iterable  = Number(params.get('iterable'));
      this.cargarGrupo();
    });
  }

  private cargarGrupo(): void {
    this.cargando = true;

    this.cursodeportivoService.getCurso(this.categoria, this.curso).subscribe({
      next: (curso) => { this.cursoInfo = curso; },
      error: () => {},
    });

    this.grupoService.getGrupo(this.categoria, this.curso, this.anio, this.iterable).subscribe({
      next: (grupo) => {
        this.grupo = grupo;
        if (grupo.idInstructor) {
          this.instructorService.getInstructor(grupo.idInstructor).subscribe({
            next: (inst) => { this.grupo!.nombreInstructor = inst.nombre; },
            error: () => {},
          });
        }
        this.horarioService.getHorarios(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (h: any) => { this.horarios = Array.isArray(h) ? h : []; },
          error: () => { this.horarios = []; },
        });
        this.cargando = false;

        this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (d) => { this.disponibilidad = d; },
          error: () => {},
        });

        const alumnoId = sessionStorage.getItem('dpt_perfil_id');
        if (alumnoId) {
          this.inscripcionesService.validarInscripcion(alumnoId, this.categoria, this.curso, this.anio, this.iterable).subscribe({
            next: (inscrito) => {
              this.yaInscrito = inscrito;
              if (inscrito) this.resolverSiEstaEnEspera();
            },
            error: () => {},
          });
        }
      },
      error: () => {
        this.notificaciones.error('No se pudo cargar el grupo', 'Revise su conexión e intente de nuevo.');
        this.cargando = false;
      },
    });
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  puedeInscribirse(): boolean {
    return puedeInscribirseUtil(this.cursoInfo, this.categoria);
  }

  /** El grupo admite inscripciones según el backend (undefined = sí, por compatibilidad). */
  grupoAbierto(): boolean {
    return inscripcionesAbiertasDeGrupo(this.grupo);
  }

  /** Se puede inscribir solo si AMBOS lo permiten: el curso y la ventana de fechas del grupo. */
  puedeInscribirseEnGrupo(): boolean {
    return this.puedeInscribirse() && this.grupoAbierto();
  }

  get avisoGrupo(): string | null {
    return avisoInscripcionGrupo(this.grupo);
  }

  get textoVentana(): string {
    return textoVentanaInscripcion(this.grupo?.fechaInscripcionApertura, this.grupo?.fechaIncripcionCierre);
  }

  inscribirse(): void {
    const idRaw = sessionStorage.getItem('dpt_perfil_id');
    if (!idRaw) {
      this.notificaciones.error('No se pudo identificar tu perfil', 'Inicia sesión de nuevo e intenta otra vez.');
      return;
    }
    const alumnoId = Number(idRaw);
    const hoy = this.datePipe.transform(new Date(), 'yyyy-MM-dd')!;

    const inscripcion: InscripcionDTO = {
      fechaInscripcion: hoy,
      fechaDesvinculacion: '',
      alumnoId,
      categoria: this.categoria,
      curso: this.curso,
      anio: this.anio,
      iterable: this.iterable,
      eliminado: 0,
    };

    this.inscribiendo = true;
    this.canceladoReciente = null;
    this.inscripcionesService.postInscripcion(inscripcion).subscribe({
      next: (resp) => {
        this.inscribiendo = false;
        this.yaInscrito = true;
        this.yaEnEspera = resp.estado === 'EN_ESPERA';
        if (this.yaEnEspera) {
          const posicion = (this.disponibilidad?.tamanoListaEspera ?? 0) + 1;
          this.posicionEspera = posicion;
          this.notificaciones.info('Quedaste en lista de espera',
            `Tu posición es la ${posicion}. Te avisaremos si se libera un cupo.`, DURACION_RESULTADO_MS);
          this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
            next: (d) => { this.disponibilidad = d; }, error: () => {},
          });
        } else {
          this.notificaciones.exito('Inscripción exitosa', 'Tu cupo en este grupo está confirmado.', DURACION_RESULTADO_MS);
        }
      },
      error: (err) => {
        this.inscribiendo = false;
        this.notificaciones.error('No se pudo completar la inscripción', err.error?.mensaje ?? 'Intenta de nuevo.');
      },
    });
  }

  cancelarInscripcion(): void {
    const idRaw = sessionStorage.getItem('dpt_perfil_id');
    if (!idRaw) return;
    const alumnoId = Number(idRaw);

    const inscripcion: InscripcionDTO = {
      fechaInscripcion: '',
      fechaDesvinculacion: this.datePipe.transform(new Date(), 'yyyy-MM-dd')!,
      alumnoId,
      categoria: this.categoria,
      curso: this.curso,
      anio: this.anio,
      iterable: this.iterable,
      eliminado: 0,
    };

    const eraEnEspera = this.yaEnEspera;
    this.cancelando = true;
    this.inscripcionesService.eliminarInscripcion(inscripcion).subscribe({
      next: () => {
        this.cancelando = false;
        this.confirmandoCancelacion = false;
        this.yaInscrito = false;
        this.yaEnEspera = false;
        this.posicionEspera = null;
        this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (d) => { this.disponibilidad = d; }, error: () => {},
        });
        this.canceladoReciente = {
          titulo: eraEnEspera ? 'Saliste de la lista de espera' : 'Inscripción cancelada',
          mensaje: eraEnEspera ? 'Ya no estás en la lista de espera de este grupo.' : 'Tu cupo quedó disponible para otras personas.',
        };
        this.notificaciones.exito(this.canceladoReciente.titulo, this.canceladoReciente.mensaje, DURACION_RESULTADO_MS);
      },
      error: () => {
        this.cancelando = false;
        this.notificaciones.error('No se pudo cancelar la inscripción', 'Intenta de nuevo.');
      },
    });
  }

  // ── Presentación ──

  get nombreCurso(): string {
    return nombrePropio(this.curso);
  }

  /** El grupo no tiene cupos libres (quien se inscriba queda en lista de espera). */
  get grupoLleno(): boolean {
    return !!this.disponibilidad && this.disponibilidad.cuposDisponibles === 0;
  }

  /** Porcentaje de cupos ocupados para la barra. */
  get porcentajeOcupacion(): number {
    const d = this.disponibilidad;
    if (!d || !d.cuposTotales) return 0;
    return Math.min(100, Math.round(((d.cuposTotales - d.cuposDisponibles) * 100) / d.cuposTotales));
  }

  franja(h: HorarioDTO): string {
    return `${formatoHora12(h.horaInicio)} – ${formatoHora12(h.horaFin)}`;
  }

  iniciales(nombre: string | null | undefined): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  /** Si ya hay inscripción, consulta si es en lista de espera (al volver a la pantalla el servidor solo dice "inscrito"). */
  private resolverSiEstaEnEspera(): void {
    this.inscripcionesService.getMisCursos().subscribe({
      next: (cursos) => {
        const mio = (cursos ?? []).find(c => c.categoria === this.categoria && c.curso === this.curso
          && c.anio === this.anio && c.iterable === this.iterable);
        this.yaEnEspera = mio?.estado === 'EN_ESPERA';
      },
      error: () => {},
    });
  }

  pedirCancelacion(): void {
    this.confirmandoCancelacion = true;
  }

  descartarCancelacion(): void {
    this.confirmandoCancelacion = false;
  }

  irAInicio(evento: Event): void {
    evento.preventDefault();
    void this.router.navigate(['/home']);
  }

  volverEnlace(evento: Event): void {
    evento.preventDefault();
    this.volver();
  }

  irAMisCursos(): void {
    void this.router.navigate(['/info-estudiante']);
  }

  volver(): void {
    void this.router.navigate(['/list-grupos', this.categoria, this.curso]);
  }
}
