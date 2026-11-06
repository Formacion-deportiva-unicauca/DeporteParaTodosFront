import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { VerNotificacionesComponent } from '../ver-notificaciones/ver-notificaciones.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { FilaMisCursos } from 'src/app/Models/DTOs/mis-cursos-dto';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';
import { horariosDeHoy, nombreDiaDeHoy } from 'src/app/shared/clases-hoy.util';
import { normalizarNombreInstructor } from 'src/app/shared/instructor-nombre.util';
import { TarjetasCursosAlumnoComponent } from '../tarjetas-cursos-alumno/tarjetas-cursos-alumno.component';

@Component({
  selector: 'app-informacion-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    SidenavComponent,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    TarjetasCursosAlumnoComponent,
  ],
  templateUrl: './informacion-estudiante.component.html',
  styleUrls: ['./informacion-estudiante.component.css'],
})
export class InformacionEstudianteComponent implements OnInit, OnDestroy {
  perfil: string = '';
  cargando = false;
  courses = new MatTableDataSource<FilaMisCursos>([]);
  nombreAlumno: string | null = null;
  codigoAlumno: string | null = null;
  tipoVinculo: string | null = null;
  facultadAlumno: string | null = null;
  programaAlumno: string | null = null;
  dependenciaAlumno: string | null = null;
  private perfilSub: Subscription = Subscription.EMPTY;
  private codigosInstructor: Map<string, string> | null = null;

  constructor(
    private dialog: MatDialog,
    private notificaciones: NotificacionService,
    private perfilService: PerfilService,
    private inscripcionesService: InscripcionesService,
    private instructorService: InstructorServisce,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.perfilSub = this.perfilService.perfil$.subscribe(p => {
      this.perfil = p;
      if (p === 'Alumno') {
        this.cargarInfoAlumno();
        this.cargarCursos();
      }
    });
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  cargarInfoAlumno(): void {
    this.nombreAlumno = null;
    this.codigoAlumno = null;
    this.tipoVinculo = null;
    this.facultadAlumno = null;
    this.programaAlumno = null;
    this.dependenciaAlumno = null;
    const raw = sessionStorage.getItem('dpt_perfil');
    if (!raw) return;
    try {
      const datos = JSON.parse(raw) as Partial<PerfilDTO>;
      this.nombreAlumno = datos.nombre ?? null;
      this.codigoAlumno = datos.id === null || datos.id === undefined ? null : String(datos.id);
      this.tipoVinculo = datos.tipoAlumno || null;
      this.facultadAlumno = datos.facultad || null;
      this.programaAlumno = datos.programa || null;
      this.dependenciaAlumno = datos.dependencia || null;
    } catch {
      sessionStorage.removeItem('dpt_perfil');
    }
  }

  cargarCursos(): void {
    this.cargando = true;
    this.cargarCodigosInstructor().subscribe(() => this.pintarCursos());
  }

  private cargarCodigosInstructor(): Observable<Map<string, string>> {
    if (this.codigosInstructor) return of(this.codigosInstructor);
    return this.instructorService.getInstructores().pipe(
      map(lista => {
        const mapa = new Map<string, string>();
        (lista ?? []).forEach(i => {
          const clave = normalizarNombreInstructor(i.nombre);
          if (clave) mapa.set(clave, i.id);
        });
        return mapa;
      }),
      catchError(() => of(new Map<string, string>())),
      tap(mapa => (this.codigosInstructor = mapa))
    );
  }

  private pintarCursos(): void {
    this.inscripcionesService.getMisCursos().subscribe({
      next: (cursos) => {
        const codigos = this.codigosInstructor ?? new Map<string, string>();
        this.courses.data = (cursos ?? []).map(c => ({
          ...c,
          instructorNombre: c.nombreInstructor,
          instructorCodigo: codigos.get(normalizarNombreInstructor(c.nombreInstructor)) ?? null,
        }));
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.notificaciones.error('No se pudieron cargar los cursos', 'Revise su conexión e intente de nuevo.');
      },
    });
  }

  /** Iniciales para el avatar (hasta dos): "Luis Alexis Mendez" → "LA". */
  get iniciales(): string {
    const partes = (this.nombreAlumno ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  /** Cursos en los que ya tiene cupo (grupo vigente e inscripción confirmada). */
  get totalInscritos(): number {
    return this.courses.data.filter(c => c.estado === 'INSCRITO' && c.grupoActivo).length;
  }

  get totalEnEspera(): number {
    return this.courses.data.filter(c => c.estado === 'EN_ESPERA' && c.grupoActivo).length;
  }

  /** Cuántos de sus cursos tienen clase hoy (solo inscritos en grupos vigentes). */
  get cursosConClaseHoy(): number {
    return this.courses.data.filter(c => c.estado === 'INSCRITO' && c.grupoActivo && horariosDeHoy(c.horarios).length > 0).length;
  }

  get diaHoy(): string {
    return nombreDiaDeHoy();
  }

  irAInicio(evento: Event): void {
    evento.preventDefault();
    void this.router.navigate(['/home']);
  }

  /** Detalle del grupo: desde ahí puede ver las condiciones y cancelar su inscripción. */
  irAGrupo(c: FilaMisCursos): void {
    void this.router.navigate(['/inscripcion-grupo', c.categoria, c.curso, c.anio, c.iterable]);
  }

  explorarCursos(): void {
    void this.router.navigate(['/home']);
  }

  openNotificacionesModal(): void {
    this.dialog.open(VerNotificacionesComponent, {});
  }
}
