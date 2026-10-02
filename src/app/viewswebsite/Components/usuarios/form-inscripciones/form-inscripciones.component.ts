import { Component, Inject, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
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
export class FormInscripcionesComponent implements OnInit {
  isEditing = false;
  isInscribirMode = false;
  tipoDocumento: string[] = ['CC', 'TI', 'CE', 'PP', 'PEP', 'DIE'];
  sexo: string[] = ['M', 'F'];
  // TODO (SCRUM-160): lista temporal — cuando TIC responda, el tipo se autocompleta desde su servicio
  tiposAlumno: string[] = ['Estudiante', 'Docente', 'Administrativo'];

  estado: EstadoBusqueda = 'busqueda';
  correoBusqueda = '';
  perfilEncontrado: PerfilDTO | null = null;
  buscando = false;

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
  }

  constructor(
    private router: Router,
    private perfilService: PerfilService,
    private alumnoService: AlumnoService,
    @Optional() private dialogref: MatDialogRef<FormInscripcionesComponent> | null,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: {
      rol?: 'Estudiante' | 'Instructor',
      modo?: 'editar' | 'inscribir',
      alumno?: AlumnoDTO,
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
      }).subscribe((response) => {
        if (response != null) {
          this.dialogref?.close({ actualizado: true });
        }
      });
      return;
    }

    const perfil: PerfilDTO = {
      id: this.perfil.id,
      nombre: this.perfil.nombre,
      correo: this.perfil.correo,
      tipoId: this.perfil.tipoId,
      sexo: this.perfil.sexo,
      facultad: '',
      // TODO (SCRUM-160): tipoAlumno es temporal — el select lo elige el Coordinador hasta que
      // la integración con el servicio de identidad de la División de TIC esté disponible.
      // Cuando ese servicio responda, este campo debería autocompletarse con el dato real de TIC.
      tipoAlumno: this.esInstructor ? 'Docente' : this.perfil.tipoAlumno,
      role: this.esInstructor ? 'Instructor' : '',
      alumnoCodigo: this.perfil.alumnoCodigo,
    };

    const peticion$ = this.esInstructor
      ? this.perfilService.registrarInstructor(perfil)
      : this.perfilService.registrarPerfil(perfil);

    peticion$.subscribe((response) => {
      if (response != null) {
        this.dialogref?.close({ confirmacionCreacion: true, idAlumno: response.id });
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/cursos_deportivos']);
  }

  onCancel(): void {
    this.dialogref?.close();
  }
}
