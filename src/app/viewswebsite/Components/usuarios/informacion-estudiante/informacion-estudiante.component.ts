import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { VerNotificacionesComponent } from '../ver-notificaciones/ver-notificaciones.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { MiCursoDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';
import { normalizarNombreInstructor } from 'src/app/shared/instructor-nombre.util';

interface FilaMisCursos extends MiCursoDTO {
  instructorNombre: string | null;
  instructorCodigo: string | null;
}

@Component({
  selector: 'app-informacion-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    SidenavComponent,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './informacion-estudiante.component.html',
  styleUrls: ['./informacion-estudiante.component.css'],
})
export class InformacionEstudianteComponent implements OnInit, OnDestroy {
  perfil: string = '';
  cargando = false;
  displayedColumns: string[] = ['curso', 'categoria', 'grupo', 'instructor', 'horario', 'estado'];
  courses = new MatTableDataSource<FilaMisCursos>([]);
  nombreAlumno: string | null = null;
  codigoAlumno: string | null = null;
  private perfilSub: Subscription = Subscription.EMPTY;
  private codigosInstructor: Map<string, string> | null = null;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private perfilService: PerfilService,
    private inscripcionesService: InscripcionesService,
    private instructorService: InstructorServisce,
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
    const raw = sessionStorage.getItem('dpt_perfil');
    if (!raw) return;
    try {
      const datos = JSON.parse(raw) as Partial<PerfilDTO>;
      this.nombreAlumno = datos.nombre ?? null;
      this.codigoAlumno = datos.id === null || datos.id === undefined ? null : String(datos.id);
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
        this.snackBar.open('Error al cargar los cursos. Intenta de nuevo.', '', {
          duration: 4000,
          panelClass: 'snack-error',
        });
      },
    });
  }

  formatGrupo(c: MiCursoDTO): string {
    return `${c.anio}-${c.periodo} · Grupo ${letraDeIterable(c.iterable)}`;
  }

  formatHorario(c: MiCursoDTO): string {
    if (!c.horarios || c.horarios.length === 0) return 'Horario por definir';
    return c.horarios
      .map(h => {
        const esc = h.escenario ? ` ${h.escenario}` : '';
        return `${h.dia} ${h.horaInicio} - ${h.horaFin}${esc}`;
      })
      .join(', ');
  }

  formatEstado(estado: string): string {
    return estado === 'INSCRITO' ? 'Inscrito' : 'En lista de espera';
  }

  openNotificacionesModal(): void {
    this.dialog.open(VerNotificacionesComponent, {});
  }
}
