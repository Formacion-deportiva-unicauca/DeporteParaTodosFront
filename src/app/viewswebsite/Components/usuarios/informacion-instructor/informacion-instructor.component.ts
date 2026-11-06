import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { MiGrupoInstructorDTO } from 'src/app/Models/DTOs/mis-cursos-dto';
import { TarjetasGruposInstructorComponent } from '../tarjetas-grupos-instructor/tarjetas-grupos-instructor.component';
import { horariosDeHoy, nombreDiaDeHoy } from 'src/app/shared/clases-hoy.util';

@Component({
  selector: 'app-informacin-instructor',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatIconModule,
    SidenavComponent,
    TarjetasGruposInstructorComponent,
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
    private notificaciones: NotificacionService,
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
        this.notificaciones.error('No se pudo cargar tu información', 'Revise su conexión e intente de nuevo.');
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
        this.notificaciones.error('No se pudieron cargar los grupos', 'Revise su conexión e intente de nuevo.');
      },
    });
  }

  /** Iniciales para el avatar (hasta dos): "Luis Alexis Mendez" → "LA". */
  get iniciales(): string {
    const partes = (this.nombreInstructor ?? '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
  }

  get totalInscritos(): number {
    return this.grupos.reduce((suma, g) => suma + (g.inscritos ?? 0), 0);
  }

  /** Cuántos de sus grupos tienen clase hoy (según el día de la semana de sus horarios). */
  get gruposConClaseHoy(): number {
    return this.grupos.filter(g => horariosDeHoy(g.horarios).length > 0).length;
  }

  get diaHoy(): string {
    return nombreDiaDeHoy();
  }

  irAInicio(evento: Event): void {
    evento.preventDefault();
    void this.router.navigate(['/home']);
  }

  verDeportistas(g: MiGrupoInstructorDTO): void {
    void this.router.navigate(['/listaDeportistasCurso', g.categoria, g.curso, g.anio, g.iterable]);
  }
}
