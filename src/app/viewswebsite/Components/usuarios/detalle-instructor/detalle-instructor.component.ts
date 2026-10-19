import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, Subject, combineLatest, distinctUntilChanged, map, merge, switchMap, takeUntil, tap, catchError } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilInstructor } from 'src/app/Models/DTOs/instructor-dto';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { TablaGruposInstructorComponent } from '../tabla-grupos-instructor/tabla-grupos-instructor.component';
import { FormInstructorComponent, ResultadoFormInstructor } from '../form-instructor/form-instructor.component';
import { FormProrrogaRegistroComponent, ResultadoFormProrrogaRegistro } from '../form-prorroga-registro/form-prorroga-registro.component';
import { textoResultadoProrroga } from 'src/app/shared/prorroga-registro.util';

/** Detalle de un instructor para el Coordinador: información personal y grupos que dirige. */
@Component({
  selector: 'app-detalle-instructor',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    SidenavComponent,
    TablaGruposInstructorComponent,
  ],
  templateUrl: './detalle-instructor.component.html',
  styleUrls: ['./detalle-instructor.component.css'],
})
export class DetalleInstructorComponent implements OnInit, OnDestroy {
  perfil = '';
  instructor: PerfilInstructor | null = null;
  cargandoInstructor = false;
  instructorNoEncontrado = false;
  grupos: MiGrupoInstructorDTO[] = [];
  cargandoGrupos = false;
  errorGrupos = false;

  private destroy$ = new Subject<void>();
  private idActual = '';

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private perfilService: PerfilService,
    private instructorService: InstructorServisce,
    private grupoService: GrupoService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.perfilService.perfil$.pipe(distinctUntilChanged()),
      this.route.paramMap.pipe(map(params => params.get('id'))),
    ]).pipe(
      tap(([perfil]) => {
        this.perfil = perfil;
        this.reiniciar();
      }),
      // Solo el Coordinador consulta; con otro rol o sin id no se llama a ningún servicio.
      // switchMap cancela las respuestas en vuelo del id anterior (no se mezclan datos).
      switchMap(([perfil, id]) =>
        perfil === 'Coordinador' && id
          ? merge(this.cargarInstructor(id), this.cargarGrupos(id))
          : EMPTY),
      takeUntil(this.destroy$),
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private reiniciar(): void {
    this.instructor = null;
    this.instructorNoEncontrado = false;
    this.cargandoInstructor = false;
    this.grupos = [];
    this.cargandoGrupos = false;
    this.errorGrupos = false;
  }

  private cargarInstructor(id: string) {
    this.idActual = id;
    this.cargandoInstructor = true;
    return this.instructorService.getInstructor(id).pipe(
      tap(instructor => {
        this.instructor = instructor;
        this.cargandoInstructor = false;
      }),
      catchError((err: HttpErrorResponse) => {
        this.cargandoInstructor = false;
        if (err?.status === 404) {
          this.instructorNoEncontrado = true;
        } else {
          this.snackBar.open('No se pudo cargar la información del instructor.', '', {
            duration: 4000,
            panelClass: 'snack-error',
          });
        }
        return EMPTY;
      }),
    );
  }

  private cargarGrupos(id: string) {
    this.cargandoGrupos = true;
    return this.grupoService.getGruposDeInstructor(id).pipe(
      tap(grupos => {
        this.grupos = Array.isArray(grupos) ? grupos : [];
        this.cargandoGrupos = false;
      }),
      catchError(() => {
        this.cargandoGrupos = false;
        this.errorGrupos = true;
        return EMPTY;
      }),
    );
  }

  editar(): void {
    if (!this.instructor) return;
    const { id, nombre, correo } = this.instructor;
    this.dialog.open(FormInstructorComponent, { data: { id, nombre, correo } })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultado?: ResultadoFormInstructor) => {
        if (!resultado) return;
        if ('yaNoExiste' in resultado) {
          this.instructorNoEncontrado = true;
          return;
        }
        // Se vuelve a pedir el instructor para mostrar lo que realmente quedó guardado.
        this.cargarInstructor(this.idActual).pipe(takeUntil(this.destroy$)).subscribe();
      });
  }

  /** Abre el diálogo de prórroga de registro con este instructor. */
  asignarProrroga(): void {
    if (!this.instructor) return;
    const { id, nombre } = this.instructor;
    this.dialog.open(FormProrrogaRegistroComponent, { data: { instructores: [{ id, nombre }] } })
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((resultado?: ResultadoFormProrrogaRegistro) => {
        if (!resultado) return;
        if ('yaNoExiste' in resultado) {
          this.instructorNoEncontrado = true;
          return;
        }
        this.snackBar.open(textoResultadoProrroga(resultado), '', { duration: 3000, panelClass: 'snack-success' });
      });
  }

  cerrar(): void {
    void this.router.navigate(['/lista-instructores']);
  }

  verDeportistas(g: MiGrupoInstructorDTO): void {
    void this.router.navigate(['/listaDeportistasCurso', g.categoria, g.curso, g.anio, g.iterable]);
  }
}
