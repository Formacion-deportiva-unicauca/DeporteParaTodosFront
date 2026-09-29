import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GrupoService } from 'src/app/services/grupo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { HorarioService } from 'src/app/services/horario.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { InscripcionDTO } from 'src/app/Models/DTOs/inscripcion-dto';
import { DisponibilidadDTO } from 'src/app/Models/DTOs/disponibilidad-dto';

@Component({
  selector: 'app-inscripcion-grupo',
  standalone: true,
  imports: [CommonModule, SidenavComponent, MatButtonModule, MatSnackBarModule],
  providers: [DatePipe],
  templateUrl: './inscripcion-grupo.component.html',
  styleUrls: ['./inscripcion-grupo.component.css'],
})
export class InscripcionGrupoComponent implements OnInit {
  categoria: string = '';
  curso: string = '';
  anio: number = 0;
  iterable: number = 0;

  grupo: GrupoDTO | null = null;
  horarios: HorarioDTO[] = [];
  disponibilidad: DisponibilidadDTO | null = null;
  cargando = true;
  inscribiendo = false;
  cancelando = false;
  yaInscrito = false;
  yaEnEspera = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private grupoService: GrupoService,
    private inscripcionesService: InscripcionesService,
    private horarioService: HorarioService,
    private instructorService: InstructorServisce,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.categoria = params.get('categoria') ?? '';
      this.curso     = params.get('curso') ?? '';
      this.anio      = Number(params.get('anio'));
      this.iterable  = Number(params.get('iterable'));
      this.cargarGrupo();
    });
  }

  private cargarGrupo(): void {
    this.cargando = true;
    this.grupoService.getGrupo(this.categoria, this.curso, this.anio, this.iterable).subscribe({
      next: (grupo) => {
        this.grupo = grupo;
        if (grupo.idInstructor) {
          this.instructorService.getInstructor(grupo.idInstructor).subscribe({
            next: (inst) => { this.grupo!.nombreInstructor = inst.nombre; },
            error: () => {},
          });
        }
        this.horarioService.getHorarios(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (h: any) => { this.horarios = Array.isArray(h) ? h : []; },
          error: () => { this.horarios = []; },
        });
        this.cargando = false;

        this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (d) => { this.disponibilidad = d; },
          error: () => {},
        });

        const alumnoId = sessionStorage.getItem('dpt_perfil_id');
        if (alumnoId) {
          this.inscripcionesService.validarInscripcion(alumnoId, this.categoria, this.curso, this.anio, this.iterable).subscribe({
            next: (inscrito) => { this.yaInscrito = inscrito; },
            error: () => {},
          });
        }
      },
      error: () => {
        this.snackBar.open('No se pudo cargar la información del grupo', 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
        this.cargando = false;
      },
    });
  }

  letraDeIterable(n: number | null): string {
    if (!n || n < 1) return '?';
    return String.fromCharCode(64 + n);
  }

  inscribirse(): void {
    const idRaw = sessionStorage.getItem('dpt_perfil_id');
    if (!idRaw) {
      this.snackBar.open('No se pudo identificar tu perfil. Intenta iniciar sesión de nuevo.', 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      return;
    }
    const alumnoId = Number(idRaw);
    const hoy = this.datePipe.transform(new Date(), 'yyyy-MM-dd')!;

    const inscripcion: InscripcionDTO = {
      fechaInscripcion: hoy,
      fechaDesvinculacion: '',
      alumnoId,
      categoria: this.categoria,
      curso: this.curso,
      anio: this.anio,
      iterable: this.iterable,
      eliminado: 0,
    };

    this.inscribiendo = true;
    this.inscripcionesService.postInscripcion(inscripcion).subscribe({
      next: (resp) => {
        this.inscribiendo = false;
        this.yaInscrito = true;
        this.yaEnEspera = resp.estado === 'EN_ESPERA';
        if (this.yaEnEspera) {
          const posicion = (this.disponibilidad?.tamanoListaEspera ?? 0) + 1;
          this.snackBar.open(
            `Quedaste en lista de espera (posición ${posicion}). Te avisaremos si se libera un cupo.`,
            'Cerrar', { duration: 6000, panelClass: ['snack-success'] }
          );
          this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
            next: (d) => { this.disponibilidad = d; }, error: () => {},
          });
        } else {
          this.snackBar.open('¡Te has inscrito al grupo exitosamente!', 'Cerrar', { duration: 5000, panelClass: ['snack-success'] });
        }
      },
      error: (err) => {
        this.inscribiendo = false;
        const msg = err.error?.mensaje ?? 'Error al inscribirse. Intenta de nuevo.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  cancelarInscripcion(): void {
    const idRaw = sessionStorage.getItem('dpt_perfil_id');
    if (!idRaw) return;
    const alumnoId = Number(idRaw);

    const inscripcion: InscripcionDTO = {
      fechaInscripcion: '',
      fechaDesvinculacion: this.datePipe.transform(new Date(), 'yyyy-MM-dd')!,
      alumnoId,
      categoria: this.categoria,
      curso: this.curso,
      anio: this.anio,
      iterable: this.iterable,
      eliminado: 0,
    };

    const eraEnEspera = this.yaEnEspera;
    this.cancelando = true;
    this.inscripcionesService.eliminarInscripcion(inscripcion).subscribe({
      next: () => {
        this.cancelando = false;
        this.yaInscrito = false;
        this.yaEnEspera = false;
        this.inscripcionesService.getDisponibilidad(this.categoria, this.curso, this.anio, this.iterable).subscribe({
          next: (d) => { this.disponibilidad = d; }, error: () => {},
        });
        const msg = eraEnEspera ? 'Saliste de la lista de espera.' : 'Inscripción cancelada.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] });
      },
      error: () => {
        this.cancelando = false;
        this.snackBar.open('No se pudo cancelar la inscripción. Intenta de nuevo.', 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  volver(): void {
    this.router.navigate(['/list-grupos', this.categoria, this.curso]);
  }
}
