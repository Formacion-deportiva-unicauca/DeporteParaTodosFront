import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { MiGrupoInstructorDTO, MisCursosHorarioDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { letraDeIterable } from 'src/app/shared/iterable-letra.util';

@Component({
  selector: 'app-informacin-instructor',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    SidenavComponent,
  ],
  templateUrl: './informacion-instructor.component.html',
  styleUrls: ['./informacion-instructor.component.css'],
})
export class InformacinInstructorComponent implements OnInit, OnDestroy {
  perfil: string = '';
  cargando = false;
  displayedColumns: string[] = ['curso', 'categoria', 'grupo', 'horario', 'cupos', 'estadoCurso', 'inscripciones', 'acciones'];
  grupos = new MatTableDataSource<MiGrupoInstructorDTO>([]);
  cargandoPerfil = false;
  nombreInstructor: string | null = null;
  codigoInstructor: string | null = null;
  private perfilSub: Subscription = Subscription.EMPTY;

  constructor(
    private snackBar: MatSnackBar,
    private perfilService: PerfilService,
    private grupoService: GrupoService,
    private instructorService: InstructorServisce,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.perfilSub = this.perfilService.perfil$.subscribe(p => {
      this.perfil = p;
      if (p === 'Instructor') {
        this.cargarGrupos();
        this.cargarInfoInstructor();
      }
    });
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  cargarInfoInstructor(): void {
    const id = sessionStorage.getItem('dpt_perfil_id');
    this.nombreInstructor = null;
    this.codigoInstructor = null;
    if (!id) return;

    this.cargandoPerfil = true;
    this.instructorService.getInstructor(id).subscribe({
      next: instructor => {
        this.nombreInstructor = instructor?.nombre ?? null;
        this.codigoInstructor = instructor?.id ? instructor.id : id;
        this.cargandoPerfil = false;
      },
      error: () => {
        this.cargandoPerfil = false;
        this.snackBar.open('No se pudo cargar tu información de instructor.', '', {
          duration: 4000,
          panelClass: 'snack-error',
        });
      },
    });
  }

  cargarGrupos(): void {
    this.cargando = true;
    this.grupoService.getMisGrupos().subscribe({
      next: (grupos) => {
        this.grupos.data = Array.isArray(grupos) ? grupos : [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.snackBar.open('Error al cargar los grupos. Intenta de nuevo.', '', {
          duration: 4000,
          panelClass: 'snack-error',
        });
      },
    });
  }

  formatGrupo(g: MiGrupoInstructorDTO): string {
    return `${g.anio}-${g.periodo} · Grupo ${letraDeIterable(g.iterable)}`;
  }

  formatHorario(horarios: MisCursosHorarioDTO[]): string {
    if (!horarios || horarios.length === 0) return 'Horario por definir';
    return horarios
      .map(h => {
        const esc = h.escenario ? ` ${h.escenario}` : '';
        return `${h.dia} ${h.horaInicio} - ${h.horaFin}${esc}`;
      })
      .join(', ');
  }

  formatCupos(g: MiGrupoInstructorDTO): string {
    const base = g.cupos == null ? 'Sin cupos definidos' : `${g.inscritos} / ${g.cupos}`;
    return g.enEspera > 0 ? `${base} · ${g.enEspera} en espera` : base;
  }

  verDeportistas(g: MiGrupoInstructorDTO): void {
    this.router.navigate(['/listaDeportistasCurso', g.categoria, g.curso, g.anio, g.iterable]);
  }
}
