import { Component, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, NgForm } from '@angular/forms';
import { PerfilService } from 'src/app/services/perfil.service';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';
import { AlumnoService } from 'src/app/services/alumno.service';
import { AlumnoDTO } from 'src/app/Models/DTOs/alumno-dto';
import { CatalogoService } from 'src/app/services/catalogo.service';
import { Subscription } from 'rxjs';
import {
  TIPOS_VINCULO,
  datosSegunTipo,
  requiereCodigo,
  requiereDependencia,
  requiereFacultadYPrograma,
} from 'src/app/shared/tipo-vinculo';

type EstadoBusqueda = 'busqueda' | 'encontrado' | 'no_encontrado' | 'rol_invalido';

@Component({
  selector: 'app-form-inscripciones',
  standalone: true,
  imports: [
    CommonModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    FormsModule,
    MatDialogModule
  ],
  templateUrl: './form-inscripciones.component.html',
  styleUrls: ['./form-inscripciones.component.css'],
})
export class FormInscripcionesComponent implements OnInit, OnDestroy {
  isEditing = false;
  isInscribirMode = false;
  tipoDocumento: string[] = ['CC', 'TI', 'CE', 'PP', 'PEP', 'DIE'];
  sexo: string[] = ['M', 'F'];
  // TODO (SCRUM-160): lista temporal — cuando TIC responda, el tipo se autocompleta desde su servicio
  tiposAlumno: string[] = TIPOS_VINCULO;
  facultades: string[] = [];
  programas: string[] = [];
  /** La facultad elegida no tiene programas cargados en el catálogo. */
  sinProgramas = false;
  errorCatalogo: string | null = null;
  /** Error al registrar al deportista; el diálogo queda abierto con lo escrito. */
  errorRegistro: string | null = null;
  private programasSub = Subscription.EMPTY;

  estado: EstadoBusqueda = 'busqueda';
  correoBusqueda = '';
  perfilEncontrado: PerfilDTO | null = null;
  buscando = false;
  /** Error al guardar la edición; el diálogo queda abierto con lo escrito. */
  errorEdicion: string | null = null;

  perfil: PerfilDTO = {
    id: 0,
    nombre: '',
    correo: '',
    tipoId: '',
    sexo: '',
    facultad: '',
    tipoAlumno: 'Estudiante',
    role: '',
    alumnoCodigo: '',
    programa: '',
    dependencia: '',
  }

  constructor(
    private router: Router,
    private perfilService: PerfilService,
    private alumnoService: AlumnoService,
    private catalogoService: CatalogoService,
    @Optional() private dialogref: MatDialogRef<FormInscripcionesComponent> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: {
      rol?: 'Estudiante' | 'Instructor',
      modo?: 'editar' | 'inscribir',
      alumno?: AlumnoDTO,
      /** El Instructor no puede cambiar el correo del alumno (solo el Coordinador). */
      bloquearCorreo?: boolean,
    } | null,
  ) { }

  ngOnInit(): void {
    if (this.dialogData?.modo === 'editar') {
      this.isEditing = true;
      const alumno = this.dialogData.alumno!;
      this.perfil.nombre = alumno.nombre;
      this.perfil.correo = alumno.correo;
      this.perfil.tipoAlumno = alumno.tipo;
    }
    if (this.dialogData?.modo === 'inscribir') {
      this.isInscribirMode = true;
      this.estado = 'busqueda';
    }
    if (!this.isEditing && !this.esInstructor) {
      this.catalogoService.getFacultades().subscribe({
        next: facultades => (this.facultades = facultades),
        error: () => (this.errorCatalogo = 'No se pudieron cargar las facultades.'),
      });
    }
  }

  ngOnDestroy(): void {
    this.programasSub.unsubscribe();
  }

  // El Instructor se registra con el código y sin facultad, programa ni dependencia (no cambia).
  get pideCodigo(): boolean {
    return !this.isEditing && (this.esInstructor || requiereCodigo(this.perfil.tipoAlumno));
  }

  get pideFacultadYPrograma(): boolean {
    return !this.isEditing && !this.esInstructor && requiereFacultadYPrograma(this.perfil.tipoAlumno);
  }

  get pideDependencia(): boolean {
    return !this.isEditing && !this.esInstructor && requiereDependencia(this.perfil.tipoAlumno);
  }

  /** Al cambiar el tipo de vínculo se descartan los datos que ya no le corresponden. */
  onTipoChange(): void {
    const { alumnoCodigo, facultad, programa, dependencia } = datosSegunTipo(this.perfil);
    Object.assign(this.perfil, { alumnoCodigo, facultad, programa, dependencia });
    if (!requiereFacultadYPrograma(this.perfil.tipoAlumno)) {
      this.programasSub.unsubscribe();
      this.programas = [];
      this.sinProgramas = false;
    }
  }

  onFacultadChange(facultad: string): void {
    this.programasSub.unsubscribe();
    this.perfil.programa = '';
    this.programas = [];
    this.sinProgramas = false;
    this.errorCatalogo = null;
    if (!facultad) return;
    this.programasSub = this.catalogoService.getProgramas(facultad).subscribe({
      next: programas => {
        this.programas = programas;
        this.sinProgramas = programas.length === 0;
      },
      error: () => (this.errorCatalogo = 'No se pudieron cargar los programas.'),
    });
  }

  get correoBloqueado(): boolean {
    return this.isEditing && this.dialogData?.bloquearCorreo === true;
  }

  get esInstructor(): boolean {
    return this.dialogData?.rol === 'Instructor';
  }

  get showRegisterForm(): boolean {
    return !this.isInscribirMode || this.estado === 'no_encontrado';
  }

  buscarAlumno(): void {
    if (!this.correoBusqueda.trim()) return;
    this.buscando = true;
    this.perfilEncontrado = null;
    this.alumnoService.buscarPorCorreo(this.correoBusqueda.trim()).subscribe({
      next: (perfil) => {
        this.buscando = false;
        if (perfil.role === 'Alumno') {
          this.perfilEncontrado = perfil;
          this.estado = 'encontrado';
        } else {
          this.estado = 'rol_invalido';
        }
      },
      error: (err) => {
        this.buscando = false;
        if (err.status === 404) {
          this.perfil.correo = this.correoBusqueda.trim();
          this.estado = 'no_encontrado';
        }
      },
    });
  }

  inscribirEncontrado(): void {
    this.dialogref?.close({ confirmacionCreacion: true, idAlumno: this.perfilEncontrado!.id });
  }

  onSubmit(form: NgForm) {
    if (this.dialogData?.modo === 'editar') {
      this.alumnoService.actualizarAlumno(this.dialogData.alumno!.id, {
        nombre: this.perfil.nombre,
        correo: this.perfil.correo,
        tipoAlumno: this.perfil.tipoAlumno,
      }).subscribe({
        next: (response) => {
          this.errorEdicion = null;
          if (response != null) {
            this.dialogref?.close({ actualizado: true });
          }
        },
        error: (err: HttpErrorResponse) => { this.errorEdicion = this.mensajeErrorEdicion(err); },
      });
      return;
    }

    const datos: PerfilDTO = {
      id: this.perfil.id,
      nombre: this.perfil.nombre,
      correo: this.perfil.correo,
      tipoId: this.perfil.tipoId,
      sexo: this.perfil.sexo,
      facultad: this.perfil.facultad,
      // TODO (SCRUM-160): tipoAlumno es temporal — el select lo elige el Coordinador hasta que
      // la integración con el servicio de identidad de la División de TIC esté disponible.
      // Cuando ese servicio responda, este campo debería autocompletarse con el dato real de TIC.
      tipoAlumno: this.esInstructor ? 'Docente' : this.perfil.tipoAlumno,
      role: this.esInstructor ? 'Instructor' : '',
      alumnoCodigo: this.perfil.alumnoCodigo,
      programa: this.perfil.programa,
      dependencia: this.perfil.dependencia,
    };
    // El Instructor no envía facultad, programa ni dependencia; el deportista solo los datos de su tipo de vínculo.
    const perfil: PerfilDTO = this.esInstructor
      ? { ...datos, facultad: '', programa: '', dependencia: '' }
      : datosSegunTipo(datos);

    this.errorRegistro = null;
    const peticion$ = this.esInstructor
      ? this.perfilService.registrarInstructor(perfil)
      : this.perfilService.registrarPerfil(perfil);

    peticion$.subscribe({
      next: (response) => {
        if (response != null) {
          this.dialogref?.close({ confirmacionCreacion: true, idAlumno: response.id });
        }
      },
      error: (err: HttpErrorResponse) => { this.errorRegistro = this.mensajeErrorRegistro(err); },
    });
  }

  private mensajeErrorRegistro(err: HttpErrorResponse): string {
    if ((err?.status === 422 || err?.status === 409) && err.error?.mensaje) return err.error.mensaje;
    return 'No se pudo registrar al deportista. Intente de nuevo.';
  }

  private mensajeErrorEdicion(err: HttpErrorResponse): string {
    if (err?.status === 403) return 'No tiene permiso para editar a este deportista.';
    if (err?.status === 422 && err.error?.mensaje) return err.error.mensaje;
    return 'No se pudo actualizar al deportista. Intente de nuevo.';
  }

  cancelar(): void {
    void this.router.navigate(['/cursos_deportivos']);
  }

  onCancel(): void {
    this.dialogref?.close();
  }
}
