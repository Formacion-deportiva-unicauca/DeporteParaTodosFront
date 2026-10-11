import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { TablaGruposInstructorComponent } from '../tabla-grupos-instructor/tabla-grupos-instructor.component';

@Component({
  selector: 'app-informacin-instructor',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    SidenavComponent,
    TablaGruposInstructorComponent,
  ],
  templateUrl: './informacion-instructor.component.html',
  styleUrls: ['./informacion-instructor.component.css'],
})
export class InformacinInstructorComponent implements OnInit, OnDestroy {
  perfil: string = '';
  cargando = false;
  grupos: MiGrupoInstructorDTO[] = [];
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
        this.grupos = Array.isArray(grupos) ? grupos : [];
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

  verDeportistas(g: MiGrupoInstructorDTO): void {
    void this.router.navigate(['/listaDeportistasCurso', g.categoria, g.curso, g.anio, g.iterable]);
  }
}
