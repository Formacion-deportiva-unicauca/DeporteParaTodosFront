import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGruposComponent } from '../../cursos/form-grupos/form-grupos.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogComponent } from '../../dialog/dialog.component';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { IconoEngranajeComponent } from 'src/app/shared/icono-engranaje/icono-engranaje.component';
import { formatoHora12 } from 'src/app/shared/ventana-registro.util';
import { textoEstadoInscripciones } from 'src/app/shared/estado-inscripciones';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { avisoInscripcionGrupo, etiquetaInscripcionGrupo, inscripcionesAbiertasDeGrupo } from 'src/app/shared/fecha-grupo.util';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { FormHorarioComponent } from '../form-horario/form-horario.component';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { DisponibilidadDTO } from 'src/app/Models/DTOs/disponibilidad-dto';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { puedeInscribirse as puedeInscribirseUtil } from 'src/app/shared/puede-inscribirse';

@Component({
  selector: 'app-list-grupos',
  standalone: true,
  imports: [
    CommonModule,
    IconoEngranajeComponent,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    SidenavComponent,
    NgIf,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './list-grupos.component.html',
  styleUrls: ['./list-grupos.component.css'],
})
export class ListGruposComponent implements OnInit {
  curso: CursoDTO | null = null;
  imagenCurso: string | null = null;
  public grupos: GrupoDTO[] = [];
  categoria: string | null = '';
  titulo: string | null = '';
  perfil?: string;
  disponibilidad: Record<string, DisponibilidadDTO> = {};

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private grupoService: GrupoService,
    private dialog: MatDialog,
    private perfilService: PerfilService,
    private imagenService: ImagenService,
    private instructorService: InstructorServisce,
    private horarioservice: HorarioService,
    private notificaciones: NotificacionService,
    private inscripcionesService: InscripcionesService,
    private cursodeportivoService: CursodeportivoService,
  ) { }

  inscrito: boolean = false;

  dispKey(anio: number | null, iterable: number | null): string {
    return `${anio}-${iterable}`;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.categoria = params.get('categoria');
      this.titulo = params.get('curso');
      this.loadGrupos(this.categoria, this.titulo);

    });

    this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
    });
  }

  private loadGrupos(categoria: any, nombreCurso: any): void {
    this.cursodeportivoService.getCurso(categoria, nombreCurso).subscribe({
      next: (curso) => {
        this.curso = curso;
        this.cargarImagenCurso(curso);
      },
      error: () => {},
    });

    this.grupoService.getGrupos(categoria, nombreCurso).subscribe(
      (grupostemp) => {
        this.grupos = grupostemp;

        this.grupos.forEach((itemgrupo) => {
          this.cargarNombreInstructor(itemgrupo);

          this.horarioservice.getHorarios(categoria, nombreCurso, itemgrupo.anio!, itemgrupo.iterable!).subscribe(
            (horarios: any) => { itemgrupo.horarios = Array.isArray(horarios) ? horarios : []; }
          );

          this.inscripcionesService.getDisponibilidad(categoria, nombreCurso, itemgrupo.anio!, itemgrupo.iterable!).subscribe({
            next: (disp) => {
              this.disponibilidad[this.dispKey(itemgrupo.anio, itemgrupo.iterable)] = disp;
            },
            error: () => {},
          });
        });
      },
      (error) => {
        console.error('Error al obtener los grupos', error);
        this.notificaciones.error('No se pudieron cargar los grupos', 'Revise su conexión e intente de nuevo.');
      }
    );
  }

  /** La imagen del resumen es la del curso (los grupos ya no muestran imagen propia en su tarjeta). */
  private cargarImagenCurso(curso: CursoDTO): void {
    if (curso?.idImagen == null) return;
    this.imagenService.getimagen(curso.idImagen).subscribe({
      next: (img) => { this.imagenCurso = img?.datosBase64 ? `data:${img.tipoArchivo};base64,${img.datosBase64}` : null; },
      error: () => { this.imagenCurso = null; },
    });
  }

  readonly textoEstadoInscripciones = textoEstadoInscripciones;

  textoEstadoCurso(estado?: string | null): string {
    if (estado === 'ACTIVO') return 'activo';
    if (estado === 'INACTIVO') return 'inactivo';
    if (estado === 'CERRADO') return 'cerrado';
    return 'sin estado';
  }

  inscritosDe(disp: DisponibilidadDTO): number {
    return Math.max(0, disp.cuposTotales - disp.cuposDisponibles);
  }

  porcentajeOcupacion(disp: DisponibilidadDTO): number {
    return disp.cuposTotales > 0 ? Math.min(100, Math.round((this.inscritosDe(disp) / disp.cuposTotales) * 100)) : 0;
  }

  get totalInscritos(): number {
    return Object.values(this.disponibilidad).reduce((suma, d) => suma + this.inscritosDe(d), 0);
  }

  get totalCuposDisponibles(): number {
    return Object.values(this.disponibilidad).reduce((suma, d) => suma + Math.max(0, d.cuposDisponibles), 0);
  }

  /** Iniciales para el avatar: primera y última palabra del nombre ("Katerinn Natalia Arcos Daza" → "KD"). */
  iniciales(nombre?: string | null): string {
    const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    const ultima = partes.length > 1 ? partes[partes.length - 1] : '';
    return (partes[0][0] + (ultima[0] ?? '')).toUpperCase();
  }

  horaCorta(hora: string): string {
    return formatoHora12(hora);
  }

  volver(evento?: Event): void {
    evento?.preventDefault();
    void this.router.navigate(['/cursos_deportivos', this.categoria]);
  }

  irAInicio(evento?: Event): void {
    evento?.preventDefault();
    void this.router.navigate(['/home']);
  }

  private cargarNombreInstructor(grupo: GrupoDTO): void {
    const id = grupo.idInstructor;
    if (id === null || id === undefined || id.trim() === '') {
      grupo.nombreInstructor = null;
      return;
    }
    this.instructorService.getInstructor(id).subscribe({
      next: (instructor) => { grupo.nombreInstructor = instructor?.nombre ?? null; },
      error: () => { grupo.nombreInstructor = null; },
    });
  }

  gestionarHorarios(item: GrupoDTO): void {
    const dialogRef = this.dialog.open(FormHorarioComponent, {
      data: {
        categoria: this.categoria,
        curso: this.titulo,
        anio: item.anio!,
        iterable: item.iterable!,
      },
    });
    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado) {
        this.horarioservice
          .getHorarios(this.categoria!, this.titulo!, item.anio!, item.iterable!)
          .subscribe((horarios: any) => { item.horarios = Array.isArray(horarios) ? horarios : []; });
      }
    });
  }

  onUpdate(anio: number, iterable: number): void {
    const dialogRef = this.dialog.open(FormGruposComponent, {
      data: { categoria: this.categoria, curso: this.titulo, anio: anio, iterable }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.loadGrupos(this.categoria, this.titulo);
        this.notificaciones.exito('Grupo actualizado', 'Los cambios del grupo se guardaron correctamente.');
      }
    });
  }
  onDelete(item: GrupoDTO): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: 'el grupo',
        nombreElemento: `${item.anio}-${this.letraDeIterable(item.iterable)}`,
        tipoElemento: 'grupo',
        categoria: this.categoria!,
        curso: this.titulo!,
        anio: item.anio!,
        iterable: item.iterable!,
        advertencia: this.advertenciaEliminacion(item),
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.loadGrupos(this.categoria, this.titulo);
        this.notificaciones.exito('Grupo eliminado', `${item.anio}-${this.letraDeIterable(item.iterable)} ya no aparece en el curso.`);
      } else if (result?.errorStatus !== undefined) {
        this.notificaciones.error('No se pudo eliminar el grupo', 'Error al eliminar el grupo, intente de nuevo.');
      }
    });
  }
  /** Aviso para el diálogo de eliminar: el backend cancela las inscripciones del grupo al borrarlo. */
  private advertenciaEliminacion(item: GrupoDTO): string | null {
    const disp = this.disponibilidad[this.dispKey(item.anio, item.iterable)];
    if (!disp) return null;
    const inscritos = Math.max(0, disp.cuposTotales - disp.cuposDisponibles);
    const enEspera = Math.max(0, disp.tamanoListaEspera);
    if (inscritos === 0 && enEspera === 0) return null;
    const partes: string[] = [];
    if (inscritos > 0) partes.push(`${inscritos} ${inscritos === 1 ? 'inscrito' : 'inscritos'}`);
    if (enEspera > 0) partes.push(`${enEspera} en lista de espera`);
    return `Este grupo tiene ${partes.join(' y ')}. Al eliminarlo se cancelarán sus inscripciones y cada alumno recuperará su cupo de curso.`;
  }

  /** Crear un grupo es de dos pasos: 1) datos del grupo, 2) sus horarios (opcional; sin horario el instructor no puede registrar asistencia). */
  nuevoGrupo(): void {
    const dialogRef = this.dialog.open(FormGruposComponent, {
      data: { categoria: this.categoria, curso: this.titulo, anio: 0 }
    });

    dialogRef.afterClosed().subscribe((creado) => {
      if (!creado) return;
      this.loadGrupos(this.categoria, this.titulo);
      const grupo = typeof creado === 'object' ? (creado as GrupoDTO) : null;
      this.notificaciones.exito('Grupo creado', grupo?.iterable
        ? `El Grupo ${this.letraDeIterable(grupo.iterable)} se creó correctamente.`
        : 'El grupo se creó correctamente.');
      if (grupo?.anio != null && grupo.iterable != null) this.definirHorariosDelGrupoNuevo(grupo);
    });
  }

  private definirHorariosDelGrupoNuevo(grupo: GrupoDTO): void {
    this.dialog.open(FormHorarioComponent, {
      data: { categoria: this.categoria, curso: this.titulo, anio: grupo.anio!, iterable: grupo.iterable!, nuevoGrupo: true },
    }).afterClosed().subscribe((guardoHorarios) => {
      this.loadGrupos(this.categoria, this.titulo);
      if (guardoHorarios) {
        this.notificaciones.exito('Horarios guardados', 'El grupo ya tiene su horario y el instructor podrá registrar la asistencia.');
      } else {
        this.notificaciones.info('Grupo sin horario', 'Puede definirlo después desde «Gestionar horarios» en el menú del grupo.');
      }
    });
  }

  /** El grupo ya cargó sus horarios y no tiene ninguno (mientras cargan es undefined: no se avisa). */
  sinHorariosCargados(grupo: GrupoDTO): boolean {
    return Array.isArray(grupo.horarios) && grupo.horarios.length === 0;
  }

  puedeInscribirse(): boolean {
    return puedeInscribirseUtil(this.curso, this.categoria);
  }

  etiquetaInscripcion(grupo: GrupoDTO): string | null {
    return etiquetaInscripcionGrupo(grupo);
  }

  /** Solo el Coordinador: cómo reabrir un grupo cerrado por su fecha de cierre (el cerrado a mano se reabre desde el menú). */
  pistaReabrir(grupo: GrupoDTO): string | null {
    return this.perfil === 'Coordinador' && !inscripcionesAbiertasDeGrupo(grupo)
      && grupo.motivoInscripcion === 'CERRADAS' && !grupo.inscripcionesCerradasManual
      ? 'Para reabrir, cambia la fecha de cierre en Actualizar' : null;
  }

  /**
   * Acción del menú del Coordinador para el cierre manual: "Cerrar" si el grupo está abierto, "Reabrir" si lo cerró él.
   * Un grupo cerrado por fecha o que aún no abre no tiene acción: se cambia con las fechas en Actualizar.
   */
  accionCierreInscripciones(grupo: GrupoDTO): string | null {
    if (grupo.inscripcionesCerradasManual) return 'Reabrir inscripciones';
    return inscripcionesAbiertasDeGrupo(grupo) ? 'Cerrar inscripciones' : null;
  }

  toggleCierreInscripciones(item: GrupoDTO): void {
    const cerrar = !item.inscripcionesCerradasManual;
    this.grupoService.cambiarCierreInscripciones(this.categoria!, this.titulo!, item.anio!, item.iterable!, cerrar).subscribe({
      next: (actualizado) => {
        item.inscripcionesCerradasManual = actualizado.inscripcionesCerradasManual;
        item.inscripcionesAbiertas = actualizado.inscripcionesAbiertas;
        item.motivoInscripcion = actualizado.motivoInscripcion;
        this.notificaciones.exito(cerrar ? 'Inscripciones cerradas' : 'Inscripciones reabiertas',
          `Las inscripciones del Grupo ${this.letraDeIterable(item.iterable)} ${cerrar ? 'se cerraron' : 'se reabrieron'} correctamente.`);
        this.actualizarEstadoDelCurso();
      },
      error: (err) => {
        this.notificaciones.error('No se pudo cambiar el estado',
          err?.error?.mensaje ?? 'No se pudo cambiar el estado de inscripciones del grupo, intente de nuevo');
      },
    });
  }

  /** El estado del curso depende de sus grupos: tras cerrar o reabrir uno se vuelve a pedir. */
  private actualizarEstadoDelCurso(): void {
    this.cursodeportivoService.getCurso(this.categoria!, this.titulo!).subscribe({
      next: (curso) => { this.curso = curso; },
      error: () => { /* el estado del curso se refresca en la próxima carga */ },
    });
  }

  inscripcionAbierta(grupo: GrupoDTO): boolean {
    return inscripcionesAbiertasDeGrupo(grupo);
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  alumnosGrupo(categoria: string, curso: string, anio: number, iterable: number, grupo?: GrupoDTO): void {
    if (this.perfil === 'Alumno') {
      // El backend decide si el grupo admite inscripciones; el Alumno no entra a inscribirse si no, y se le explica por qué.
      if (!inscripcionesAbiertasDeGrupo(grupo)) {
        const aviso = avisoInscripcionGrupo(grupo);
        if (aviso) this.notificaciones.error('Inscripción no disponible', aviso);
        return;
      }
      void this.router.navigate(['/inscripcion-grupo', categoria, curso, anio, iterable]);
    } else {
      void this.router.navigate(['/listaDeportistasCurso', categoria, curso, anio, iterable]);
    }
  }
}
