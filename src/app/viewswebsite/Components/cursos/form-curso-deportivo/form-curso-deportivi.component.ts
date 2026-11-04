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
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { catchError } from 'rxjs';


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
  ],
  templateUrl: './form-curso-deportivi.component.html',
  styleUrls: ['./form-curso-deportivi.component.css'],
})
export class FormCursoDeportiviComponent implements OnInit {

  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
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
    private ntfMatsnackBar: MatSnackBar,
    private cursodeportivoserce: CursodeportivoService,
    private deporteServise: DeporteService,
    private imagenService: ImagenService,
    private dialogRef: MatDialogRef<FormCursoDeportiviComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { tituloCategoria: string, nombrecurso: string },
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
    if (this.isEditing) {
      this.updateCurso();
    } else {
      this.crearCurso();
    }

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
      this.imagenService.postImagen(this.selectedFile).subscribe(
        (imagenResponse) => {
          const idImagen = imagenResponse.id;

          const nuevoCurso: CursoDTO = {
            nombre: this.curso.nombre,
            deporte: this.curso.deporte,
            categoriaCurso: this.data.tituloCategoria,
            descripcion: this.curso.descripcion,
            idImagen: idImagen,
            publico: this.curso.publico ?? 'MIXTO',
          };
          this.cursodeportivoserce.crearCurso(nuevoCurso).subscribe(
            (response) => {
              console.log('Curso creado con éxito', response);
              this.dialogRef.close(true);
            },
            (error) => {
              console.error('Error al crear el curso deportivo', error);
            }
          );
        },
        (error) => {
          console.error('Error al subir la imagen', error);
        }
      );
    } else {
      const nuevoCurso: CursoDTO = {
        nombre: this.curso.nombre,
        deporte: this.curso.deporte,
        categoriaCurso: this.data.tituloCategoria,
        descripcion: this.curso.descripcion,
            publico: this.curso.publico ?? 'MIXTO',
      };
      this.cursodeportivoserce.crearCurso(nuevoCurso).subscribe(
        (response) => {
          console.log('Curso creado con éxito', response);
          this.dialogRef.close(true);
        },
        (error) => {
          console.error('Error al crear el curso deportivo', error);
        }
      );
    }
  }

  private updateCurso(): void {
    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe(
        (imagenResponse) => {
          const idImagen = imagenResponse.id;

          const nuevoCurso: CursoDTO = {
            nombre: this.curso.nombre,
            deporte: this.curso.deporte,
            categoriaCurso: this.data.tituloCategoria,
            descripcion: this.curso.descripcion,
            idImagen: idImagen,
            publico: this.curso.publico ?? 'MIXTO',
          };

          this.cursodeportivoserce.updateCurso(this.data.tituloCategoria, this.data.nombrecurso, nuevoCurso).subscribe(
            (response) => {
              console.log('Curso actualizado con éxito', response);
              this.dialogRef.close(true);
            },
            (error) => {
              console.error('Error al actualizar el curso deportivo', error);
              this.ntfMatsnackBar.open(
                'Verifique que los datos del formulario estén completos para hacer el registro. La imagen es obligatoria.',
                'Cerrar',
                { duration: 5000 }
              );
            }
          );
        }
      );
    } else {
      const nuevoCurso: CursoDTO = {
        nombre: this.curso.nombre,
        deporte: this.curso.deporte,
        categoriaCurso: this.data.tituloCategoria,
        descripcion: this.curso.descripcion,
        idImagen: this.curso.idImagen,
            publico: this.curso.publico ?? 'MIXTO',
      };

      this.cursodeportivoserce.updateCurso(this.data.tituloCategoria, this.data.nombrecurso, nuevoCurso).subscribe(
        (response) => {
          console.log('Curso actualizado con éxito', response);
          this.dialogRef.close(true);
        },
        (error) => {
          this.ntfMatsnackBar.open(
            'Verifique que los datos del formulario estén completos para hacer el registro. La imagen es obligatoria.',
            'Cerrar',
            { duration: 5000 }
          );
        }
      );
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
