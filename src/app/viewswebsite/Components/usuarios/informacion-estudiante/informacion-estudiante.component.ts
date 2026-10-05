import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { VerNotificacionesComponent } from '../ver-notificaciones/ver-notificaciones.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { MiCursoDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';

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
  courses = new MatTableDataSource<MiCursoDTO>([]);
  private perfilSub: Subscription = Subscription.EMPTY;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private perfilService: PerfilService,
    private inscripcionesService: InscripcionesService,
  ) {}

  ngOnInit(): void {
    this.perfilSub = this.perfilService.perfil$.subscribe(p => {
      this.perfil = p;
      if (p === 'Alumno') {
        this.cargarCursos();
      }
    });
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  cargarCursos(): void {
    this.cargando = true;
    this.inscripcionesService.getMisCursos().subscribe({
      next: (cursos) => {
        this.courses.data = cursos;
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
