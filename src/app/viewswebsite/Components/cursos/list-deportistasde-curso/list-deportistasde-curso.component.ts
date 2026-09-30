import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlumnoService } from 'src/app/services/alumno.service';
import { ActivatedRoute } from '@angular/router';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormInscripcionesComponent } from '../../usuarios/form-inscripciones/form-inscripciones.component';
import { DialogComponent } from '../../dialog/dialog.component';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { InscripcionDTO } from 'src/app/Models/DTOs/inscripcion-dto';
import { InscripcionEnEsperaDto } from 'src/app/Models/DTOs/inscripcion-en-espera-dto';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ClaseService } from 'src/app/services/clase.service';
import { AsistenciaService } from 'src/app/services/asistencia.service';
import { ClaseDTO } from 'src/app/Models/DTOs/clase-dto';
import { AtencionDTO } from 'src/app/Models/DTOs/atencion-dto';
import { PerfilService } from 'src/app/services/perfil.service';

@Component({
  selector: 'app-list-deportistasde-curso',
  standalone: true,
  imports: [
    CommonModule,
    SidenavComponent,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatCheckboxModule,
    MatSnackBarModule
  ],
  providers: [
    DatePipe,
  ],
  templateUrl: './list-deportistasde-curso.component.html',
  styleUrls: ['./list-deportistasde-curso.component.css'],
})
export class ListDeportistasdeCursoComponent implements OnInit {

  categoria: string | null = '';
  titulo: string | null = '';
  anio: number | null = null;
  iterable: number | null = null;
  alumnos = new MatTableDataSource<AlumnoDTO>([]);
  listaEspera: InscripcionEnEsperaDto[] = [];
  seleccionados: any[] = [];
  rol: string = '';
  clases: ClaseDTO[] = [];
  clasesAtenciones: Record<number, AtencionDTO[]> = {};
  clasesExpandidas = new Set<number>();
  historialVisible = false;
  displayedColumns: string[] = ['Código', 'Nombre', 'Correo', 'Faltas', 'Asistencia', 'Acciones'];
  displayedColumnsEspera: string[] = ['Posicion', 'Nombre', 'Correo', 'FechaInscripcion', 'Acciones'];
  fechaActual: Date = new Date();

  grupo: GrupoDTO = {
    categoria: '',
    curso: '',
    anio: 0,
    iterable: 0,
    imagenGrupo: 0,
    idInstructor: '',
    nombreInstructor: '',
    cupos: 0,
    fechaCreacion: '',
    fechaFinalizacion: '',
    fechaInscripcionApertura: '',
    fechaIncripcionCierre: ''
  }

  constructor(
    private alumnoService: AlumnoService,
    private route: ActivatedRoute,
    private grupoService: GrupoService,
    private instructorService: InstructorServisce,
    private horarioSerive: HorarioService,
    private inscripcionService: InscripcionesService,
    private perfilService: PerfilService,
    private datepipe: DatePipe,
    private dialog: MatDialog,
    private claseService: ClaseService,
    private asistenciaService: AsistenciaService,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.perfilService.perfil$.subscribe(p => { this.rol = p; });
    this.route.paramMap.subscribe(
      (params) => {
        this.categoria = params.get('categoria');
        this.titulo = params.get('curso');
        this.anio = Number(params.get('anio'));
        this.iterable = Number(params.get('iterable'));
      }
    );
    this.cargarDatos();
  }

  cargarDatos(): void {
    //Cargar información del grupo
    this.grupoService.getGrupo(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe(
      (grupoTemp) => {
        this.grupo = grupoTemp;
        this.consultarInstructor(grupoTemp.idInstructor!);
        this.horarioSerive.getHorarios(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe(
          (horario) => {
            grupoTemp.horarios = horario;
          }
        );
      }
    );

    this.alumnoService.getAlumnosGrupo(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe(
      {
        next: (data) => {
          this.alumnos.data = Array.isArray(data) ? data : [];
        },
        error: (err) => {
          console.error('Error al traer alumnos:', err);
          this.alumnos.data = [];
        }
      }
    );

    this.inscripcionService.getListaEspera(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: (data) => { this.listaEspera = Array.isArray(data) ? data : []; },
      error: () => { this.listaEspera = []; }
    });
  }

  consultarInstructor(id: string): void {
    this.instructorService.getInstructor(id).subscribe(
      (instructor) => {
        this.grupo.nombreInstructor = instructor.nombre;
      }
    );
  }

  inscribirAlumno() {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'inscribir' }
    });

    dialogRef.afterClosed().subscribe(
      (resultado) => {
        if (resultado.confirmacionCreacion) {

          const inscripcion: InscripcionDTO = {
            fechaInscripcion: this.FormatDate(this.fechaActual!),
            fechaDesvinculacion: '',
            alumnoId: resultado.idAlumno,
            categoria: this.categoria!,
            curso: this.titulo!,
            anio: this.anio!,
            iterable: this.iterable!,
            eliminado: 0,
          }
          this.inscripcionService.postInscripcion(inscripcion).subscribe(
            (response) => {
              if (response != null) {
                this.ngOnInit();
              }
            }
          );
        }
      });
  }

  private FormatDate(fecha: Date): string {
    return this.datepipe.transform(fecha, 'yyyy-MM-dd')!;
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  editarAlumno(alumno: AlumnoDTO) {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { modo: 'editar', alumno },
    });
    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado?.actualizado) {
        this.cargarDatos();
        this.snackBar.open('Datos del deportista actualizados', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      }
    });
  }

  eliminarAlumno(alumno: AlumnoDTO) {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: ' al estudiante',
        nombreElemento: this.titulo!,
        tipoElemento: 'inscripcion',
        categoria: this.categoria!,
        alumnoId: alumno.id,
        anio: this.anio!,
        iterable: this.iterable!,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.cargarDatos();
        this.snackBar.open('Deportista desvinculado del grupo', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al desvincular al deportista, intente de nuevo', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
      }
    });
  }

  toggleSelection(alumno: any, event: any) {
    if (event.checked) {
      this.seleccionados.push(alumno);
    } else {
      this.seleccionados = this.seleccionados.filter(a => a !== alumno);
    }
  }

  isSelected(alumno: any): boolean {
    return this.seleccionados.includes(alumno);
  }

  promover(alumno: InscripcionEnEsperaDto): void {
    this.inscripcionService.promoverAlumno(alumno.alumnoId, this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: () => {
        this.snackBar.open(`${alumno.nombre} promovido al grupo`, 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
        this.cargarDatos();
      },
      error: (err) => {
        const msg = err?.status === 409 ? 'El alumno ya está inscrito en el grupo' : 'Error al promover, intente de nuevo';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      }
    });
  }

  cargarHistorial(): void {
    this.claseService.getClase(this.categoria!, this.titulo!, this.anio!, this.iterable!).subscribe({
      next: (clases) => {
        this.clases = clases;
        this.historialVisible = true;
      },
      error: () => {
        this.snackBar.open('Error al cargar el historial de clases', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      },
    });
  }

  toggleClase(clase: ClaseDTO): void {
    if (this.clasesExpandidas.has(clase.codigo)) {
      this.clasesExpandidas.delete(clase.codigo);
      return;
    }
    this.clasesExpandidas.add(clase.codigo);
    this.asistenciaService.getAtencionesClase(clase.codigo).subscribe({
      next: (atenciones) => { this.clasesAtenciones[clase.codigo] = atenciones; },
      error: () => {
        this.snackBar.open('Error al cargar las atenciones', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      },
    });
  }

  getNombreAlumno(perfId: string): string {
    const alumno = this.alumnos.data.find(a => String(a.id) === perfId);
    return alumno?.nombre ?? perfId;
  }

  eliminarAtencion(atencion: AtencionDTO, clase: ClaseDTO): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: 'la asistencia de',
        nombreElemento: this.getNombreAlumno(atencion.idPerfil),
        tipoElemento: 'asistencia',
        prmPerfId: atencion.idPerfil,
        prmClsCodigo: clase.codigo,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.asistenciaService.getAtencionesClase(clase.codigo).subscribe({
          next: (atenciones) => { this.clasesAtenciones[clase.codigo] = atenciones; },
          error: () => {},
        });
        this.snackBar.open('Asistencia eliminada correctamente', 'Cerrar', {
          duration: 3000, panelClass: ['snack-success'],
        });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al eliminar la asistencia, intente de nuevo', 'Cerrar', {
          duration: 3000, panelClass: ['snack-error'],
        });
      }
    });
  }

  registrarAsistencia() {
    const claseData: ClaseDTO = {
      codigo: 0,
      idGrupoCategoria: this.categoria!,
      idGrupoCurso: this.titulo!,
      idGrupoAnio: this.anio!,
      idGrupoIterable: this.iterable!,
      idInstructor: this.grupo.idInstructor!,
      fecha: this.FormatDate(this.fechaActual),
      horas: 1,
      minutos: 0,
      observacion: '',
      eliminado: 0,
    };

    this.claseService.postClase(claseData).subscribe({
      next: (clase) => {
        const atenciones: AtencionDTO[] = this.seleccionados.map((alumno: AlumnoDTO) => ({
          idPerfil: String(alumno.id),
          idClase: clase.codigo,
          estaAtendido: true,
        }));

        this.asistenciaService.registrarAsistencias(clase.codigo, atenciones).subscribe({
          next: () => {
            this.seleccionados = [];
            this.snackBar.open('Asistencia registrada correctamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['snack-success'],
            });
          },
          error: () => {
            this.snackBar.open('Error al registrar asistencia, intente de nuevo', 'Cerrar', {
              duration: 3000,
              panelClass: ['snack-error'],
            });
          }
        });
      },
      error: () => {
        this.snackBar.open('Error al crear la clase, intente de nuevo', 'Cerrar', {
          duration: 3000,
          panelClass: ['snack-error'],
        });
      }
    });
  }


}
