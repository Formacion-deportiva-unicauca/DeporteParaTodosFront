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
import { MiCursoDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { primerCruce } from 'src/app/shared/cruce-horarios.util';

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
  /** Se está averiguando si ya está inscrita o en espera: mientras tanto no se ofrece inscribirse. */
  resolviendoEstado = false;
  /** Inscripciones del Alumno, para avisar de un cruce de horarios antes de inscribirse; vacío si no se pudieron pedir. */
  private misCursos: MiCursoDTO[] = [];
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
        if (alumnoId) this.resolverEstadoInscripcion(alumnoId);
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

  /**
   * Aviso de cruce de horarios ("Se cruza con Natación, grupo A, lunes 18:00-19:30") o null. Solo informa: el backend decide y
   * su 422 se sigue mostrando. Solo para el Alumno, y no si ya está inscrito o en espera en este grupo ni mientras se averigua.
   * Si misCursos falló la lista está vacía y no hay aviso.
   */
  get textoCruce(): string | null {
    if (sessionStorage.getItem('dpt_role') !== 'Alumno' || this.yaInscrito || this.resolviendoEstado || !this.grupo) return null;
    return primerCruce({
      categoria: this.categoria, curso: this.curso, anio: this.anio, iterable: this.iterable,
      periodo: this.grupo.periodo, horarios: this.horarios,
    }, this.misCursos)?.texto ?? null;
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
          // Texto neutro: el backend manda a la lista de espera también con cupo libre (si ya había cola), así que no se habla de cupos.
          this.notificaciones.info('Quedaste en la lista de espera de este grupo',
            `Tu posición es la ${posicion}.`, DURACION_RESULTADO_MS);
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

  /**
   * Hay cupo libre pero también gente esperando: quien llega NO entra directo, queda al final de la lista (el backend respeta
   * el orden de llegada). Solo se sabe con la disponibilidad cargada; si no, no se afirma nada.
   */
  get colaConCupoLibre(): boolean {
    return !!this.disponibilidad && this.disponibilidad.cuposDisponibles > 0 && this.disponibilidad.tamanoListaEspera > 0;
  }

  /** Quien se inscriba hoy quedará en la lista de espera: porque el grupo está lleno o porque ya hay cola. */
  get iraAListaDeEspera(): boolean {
    return this.grupoLleno || this.colaConCupoLibre;
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

  /**
   * Averigua si la persona ya está inscrita (INSCRITO), en lista de espera (EN_ESPERA) o sin inscripción en este grupo.
   * Para el Alumno se usa misCursos, que trae el estado; validarInscripcion solo responde "sí" para INSCRITO, así que no
   * distingue la lista de espera. Si misCursos falla se cae en validarInscripcion, como antes. El Coordinador no puede
   * pedir misCursos (403): para él no cambia nada y no se hace esa llamada.
   */
  private resolverEstadoInscripcion(alumnoId: string): void {
    this.resolviendoEstado = true;
    this.misCursos = [];
    if (sessionStorage.getItem('dpt_role') !== 'Alumno') {
      this.resolverConValidarInscripcion(alumnoId);
      return;
    }
    this.inscripcionesService.getMisCursos().subscribe({
      next: (cursos) => {
        const mio = (cursos ?? []).find(c => c.grupoActivo !== false && c.categoria === this.categoria
          && c.curso === this.curso && c.anio === this.anio && c.iterable === this.iterable);
        this.misCursos = cursos ?? [];
        this.yaInscrito = !!mio;
        this.yaEnEspera = mio?.estado === 'EN_ESPERA';
        // La posición solo se conoce al unirse; al volver a entrar no se inventa.
        this.posicionEspera = null;
        this.resolviendoEstado = false;
      },
      error: () => this.resolverConValidarInscripcion(alumnoId),
    });
  }

  private resolverConValidarInscripcion(alumnoId: string): void {
    this.inscripcionesService.validarInscripcion(alumnoId, this.categoria, this.curso, this.anio, this.iterable).subscribe({
      next: (inscrito) => {
        this.yaInscrito = inscrito;
        this.resolviendoEstado = false;
      },
      error: () => { this.resolviendoEstado = false; },
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
