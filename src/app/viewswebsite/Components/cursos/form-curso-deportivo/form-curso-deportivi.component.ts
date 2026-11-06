import { MatButtonModule } from '@angular/material/button';
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, NgForm, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { OpcionPublico, PUBLICOS_CURSO, descripcionPublico } from 'src/app/shared/publico-curso';
import { DeporteService } from 'src/app/services/deporte.service';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DeporteDTO } from 'src/app/Models/DTOs/deporte-dto';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';


@Component({
  selector: 'app-form-curso-deportivi',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    CommonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatButtonModule,
  ],
  templateUrl: './form-curso-deportivi.component.html',
  styleUrls: ['./form-curso-deportivi.component.css'],
})
export class FormCursoDeportiviComponent implements OnInit {

  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  /** true mientras se envía: el botón se deshabilita y no admite un segundo envío. */
  guardando = false;
  /** Mensaje para mostrar dentro del diálogo cuando el servidor falla; vacío si no hay error. */
  errorServidor = '';
  deportes: DeporteDTO[] = [];
  deporteFiltrado: DeporteDTO[] = [];
  private nombreCategoria: string = '';
  readonly publicos: OpcionPublico[] = PUBLICOS_CURSO;

  curso: CursoDTO = {
    nombre: '',
    deporte: '',
    categoriaCurso: '',
    descripcion: '',
    idImagen: null,
    publico: 'MIXTO',
  }

  constructor(
    private cursodeportivoserce: CursodeportivoService,
    private deporteServise: DeporteService,
    private imagenService: ImagenService,
    private dialogRef: MatDialogRef<FormCursoDeportiviComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tituloCategoria: string, nombrecurso: string },
    private notificaciones: NotificacionService,
  ) { }

  ngOnInit(): void {
    this.nombreCategoria = this.data.tituloCategoria;
    if (this.data && this.data.nombrecurso) {
      this.isEditing = true;
      this.loadCurso(this.data.nombrecurso);
    }
    this.deporteServise.getDeportes().subscribe((data) => {
      this.deportes = data;
      this.deporteFiltrado = data;
    });
  }

  loadCurso(nombre: string): void {
    this.cursodeportivoserce.getCurso(this.nombreCategoria, nombre).subscribe(
      (curso) => {
        this.curso = curso;
        // Un curso que llega sin público (backend anterior) se edita como toda la comunidad.
        if (!curso.publico) {
          curso.publico = 'MIXTO';
        }
        if (curso.idImagen != null) {
          this.imagenService.getimagen(curso.idImagen).subscribe(
            (imagenData) => {
              curso.imagenBase64 = imagenData.datosBase64;
              curso.tipoArchivo = imagenData.tipoArchivo;
              this.imagenPreview = `data:${curso.tipoArchivo};base64,${curso.imagenBase64}`;
            },
            (error) => {
              console.log('Error al obtener la imagen del curso seleccionado', error);
            }
          )
        }
      },
      (error) => {
        console.error('Se produjo un error al tratar cargar el curso seleccionado', error);
      }
    );
  }

  get descripcionPublicoElegido(): string {
    return descripcionPublico(this.curso.publico);
  }

  onSubmit(form: NgForm): void {
    if (this.guardando) {
      return;
    }
    if (form.invalid) {
      // Muestra bajo cada campo qué falta, en lugar de enviar un curso incompleto.
      form.control.markAllAsTouched();
      return;
    }
    this.guardando = true;
    this.errorServidor = '';
    if (this.isEditing) {
      this.updateCurso();
    } else {
      this.crearCurso();
    }
  }

  private exito(): void {
    this.guardando = false;
    this.dialogRef.close(true);
  }

  private fallo(mensaje: string): void {
    this.guardando = false;
    this.errorServidor = mensaje;
    this.notificaciones.error(this.isEditing ? 'No se pudo actualizar el curso' : 'No se pudo crear el curso', mensaje);
  }

  private falloGuardado(): void {
    this.fallo('No se pudo guardar el curso. Revise los datos e intente de nuevo.');
  }

  private falloImagen(): void {
    this.fallo('No se pudo subir la imagen. Intente con otro archivo.');
  }

  private construirCurso(idImagen?: number | null): CursoDTO {
    return {
      nombre: this.curso.nombre,
      deporte: this.curso.deporte,
      categoriaCurso: this.data.tituloCategoria,
      descripcion: this.curso.descripcion,
      ...(idImagen !== undefined ? { idImagen } : {}),
      publico: this.curso.publico ?? 'MIXTO',
    };
  }

  private crearCurso(): void {
    /**
     * TODO: Al crear un curso deportivo se requiere que si el deporte no se encuentra en el listado, el usuario pueda ingresar el nombre del nuevo deporte.
     *       Actualmente el sistema esta generando un error por violación de llave foranea. Esto se debe solucionar.
     */
    if(!this.ValidarExistenciaDeporte(this.curso.deporte)){
      const nuevoDeporte: DeporteDTO={nombre: this.curso.deporte}
      this.deporteServise.crearDeporte(nuevoDeporte).subscribe(
        (response)=>{response;}
      );
    }
    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe({
        next: (imagenResponse) => this.cursodeportivoserce.crearCurso(this.construirCurso(imagenResponse.id)).subscribe({
          next: () => this.exito(),
          error: () => this.falloGuardado(),
        }),
        error: () => this.falloImagen(),
      });
    } else {
      this.cursodeportivoserce.crearCurso(this.construirCurso()).subscribe({
        next: () => this.exito(),
        error: () => this.falloGuardado(),
      });
    }
  }

  private updateCurso(): void {
    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe({
        next: (imagenResponse) => this.cursodeportivoserce
          .updateCurso(this.data.tituloCategoria, this.data.nombrecurso, this.construirCurso(imagenResponse.id)).subscribe({
            next: () => this.exito(),
            error: () => this.falloGuardado(),
          }),
        error: () => this.falloImagen(),
      });
    } else {
      this.cursodeportivoserce
        .updateCurso(this.data.tituloCategoria, this.data.nombrecurso, this.construirCurso(this.curso.idImagen)).subscribe({
          next: () => this.exito(),
          error: () => this.falloGuardado(),
        });
    }
  }

  filtrarDeportes(valor: string) {
    const filtro = valor.toLowerCase();
    this.deporteFiltrado = this.deportes.filter((d) =>
      d.nombre.toLowerCase().includes(filtro)
    );
  }

  ValidarExistenciaDeporte(deporte: String){
    return this.deportes.some(d=>d.nombre.toLowerCase()=== deporte.toLowerCase());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      this.imagenSeleccionada = input.files[0];
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(this.imagenSeleccionada);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
