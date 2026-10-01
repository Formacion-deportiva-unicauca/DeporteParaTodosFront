import { Component, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute, Router } from '@angular/router';
import { FormGruposComponent } from '../../cursos/form-grupos/form-grupos.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DialogComponent } from '../../dialog/dialog.component';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormHorarioComponent } from '../form-horario/form-horario.component';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { DisponibilidadDTO } from 'src/app/Models/DTOs/disponibilidad-dto';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';

@Component({
  selector: 'app-list-grupos',
  standalone: true,
  imports: [
    CommonModule,
    MatGridListModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    SidenavComponent,
    NgIf,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
  ],
  templateUrl: './list-grupos.component.html',
  styleUrls: ['./list-grupos.component.css'],
})
export class ListGruposComponent implements OnInit {
  curso: CursoDTO | null = null;
  public colsize = 3;
  public isMobile: boolean = false;
  public grupos: GrupoDTO[] = [];
  categoria: string | null = '';
  titulo: string | null = '';
  perfil?: string;
  disponibilidad: Record<string, DisponibilidadDTO> = {};

  constructor(
    private breakPointObserver: BreakpointObserver,
    private router: Router,
    private route: ActivatedRoute,
    private grupoService: GrupoService,
    private dialog: MatDialog,
    private perfilService: PerfilService,
    private imagenService: ImagenService,
    private instructorService: InstructorServisce,
    private horarioservice: HorarioService,
    private snackBar: MatSnackBar,
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

    this.breakPointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => {
        this.isMobile = result.matches;
        if (this.isMobile) {
          this.colsize = 1;
        } else {
          this.colsize = 3;
        }
      });

    this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
    });
  }

  private loadGrupos(categoria: any, nombreCurso: any): void {
    this.cursodeportivoService.getCurso(categoria, nombreCurso).subscribe({
      next: (curso) => { this.curso = curso; },
      error: () => {},
    });

    this.grupoService.getGrupos(categoria, nombreCurso).subscribe(
      (grupostemp) => {
        this.grupos = grupostemp;

        this.grupos.forEach((itemgrupo) => {
          this.instructorService.getInstructor(itemgrupo.idInstructor!).subscribe(
            (instructor) => { itemgrupo.nombreInstructor = instructor.nombre; }
          );

          this.horarioservice.getHorarios(categoria, nombreCurso, itemgrupo.anio!, itemgrupo.iterable!).subscribe(
            (horarios: any) => { itemgrupo.horarios = Array.isArray(horarios) ? horarios : []; }
          );

          if (itemgrupo.imagenGrupo != null) {
            this.imagenService.getimagen(itemgrupo.imagenGrupo).subscribe(
              (imagenTemp) => {
                itemgrupo.imagenBase64 = imagenTemp.datosBase64;
                itemgrupo.tipoArchivo = imagenTemp.tipoArchivo;
              }
            );
          }

          this.inscripcionesService.getDisponibilidad(categoria, nombreCurso, itemgrupo.anio!, itemgrupo.iterable!).subscribe({
            next: (disp) => {
              this.disponibilidad[this.dispKey(itemgrupo.anio, itemgrupo.iterable)] = disp;
            },
            error: () => {},
          });
        });
      },
      (error) => console.error('Error al obtener los grupos', error)
    );
  }

  gestionarHorarios(item: GrupoDTO): void {
    const dialogRef = this.dialog.open(FormHorarioComponent, {
      data: {
        categoria: this.categoria,
        curso: this.titulo,
        anio: item.anio!,
        iterable: item.iterable!,
      },
      width: '500px',
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
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.loadGrupos(this.categoria, this.titulo);
        this.snackBar.open('Grupo eliminado correctamente', 'Cerrar', { duration: 3000, panelClass: ['snack-success'] });
      } else if (result?.errorStatus !== undefined) {
        this.snackBar.open('Error al eliminar el grupo, intente de nuevo', 'Cerrar', { duration: 3000, panelClass: ['snack-error'] });
      }
    });
  }
  nuevoGrupo(): void {
    const dialogRef = this.dialog.open(FormGruposComponent, {
      data: { categoria: this.categoria, curso: this.titulo, anio: 0 }
    });

    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.ngOnInit();
      }
    });
  }

  puedeInscribirse(): boolean {
    if (this.categoria?.toLowerCase() === 'seleccionado') return false;
    return this.curso?.estadoCurso === 'ACTIVO' && this.curso?.estadoInscripciones === 'ABIERTO';
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  alumnosGrupo(categoria: string, curso: string, anio: number, iterable: number): void {
    if (this.perfil === 'Alumno') {
      this.router.navigate(['/inscripcion-grupo', categoria, curso, anio, iterable]);
    } else {
      this.router.navigate(['/listaDeportistasCurso', categoria, curso, anio, iterable]);
    }
  }
}
