import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, NgForm } from '@angular/forms';
import { GrupoService } from 'src/app/services/grupo.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';

@Component({
  selector: 'app-form-grupos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatButtonModule,

  ],

  providers: [
    MatDatepickerModule,
    MatNativeDateModule,
    DatePipe,
  ],
  templateUrl: './form-grupos.component.html',
  styleUrls: ['./form-grupos.component.css'],
})
export class FormGruposComponent implements OnInit {
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  categoriaGrupo: string | null = '';
  cursoGrupo: string | null = '';
  // BUG 1 FIX: any[] porque el backend devuelve estructura plana {id, nombre, ...}
  // distinta a lo que define InstructorDTO { inst_codigo, perfil: {...} }
  instructores: any[] = [];
  // BUG 2 FIX: variables Date separadas para los mat-datepicker (GrupoDTO usa string | null)
  fechaCreacionDate: Date | null = new Date();
  fechaFinalizacionDate: Date | null = null;

  grupo: GrupoDTO = {
    categoria: '',
    curso: '',
    anio: null,
    iterable: null,
    imagenGrupo: null,
    idInstructor: '',
    nombreInstructor: '',
    cupos: 0,
    fechaCreacion: '',
    fechaFinalizacion: '',
    fechaInscripcionApertura: '',
    fechaIncripcionCierre: '',
  }


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { categoria: string, curso: string, anio: number, iterable: number },
    private grupoService: GrupoService,
    private imagenService: ImagenService,
    private datepipe: DatePipe,
    private dialogRef: MatDialogRef<FormGruposComponent>,
    private instructorService: InstructorServisce,
  ) { }

  //Variables globales
  fechaActual: Date = new Date();

  ngOnInit(): void {
    this.categoriaGrupo = this.data.categoria;
    this.cursoGrupo = this.data.curso;
    // BUG 2 FIX: inicializar la variable Date (no el string del DTO)
    this.fechaCreacionDate = new Date();

    if (this.data.anio != 0) {
      this.isEditing = true;
      this.loadGrupo(this.categoriaGrupo, this.cursoGrupo, this.data.anio, this.data.iterable);
    }
//obteniendo instructoress
    this.instructorService.getInstructores().subscribe(
      (response) => {
        this.instructores = response;
      }
    );
  }

  private loadGrupo(categoriaGrupo: string, cursoGrupo: string, anio: number, iterable: number): void {
    this.grupoService.getGrupo(categoriaGrupo, cursoGrupo, anio, iterable).subscribe(
      (grupotemp) => {
        this.grupo = grupotemp;
        if (this.grupo.imagenGrupo != null) {
          this.imagenService.getimagen(this.grupo.imagenGrupo).subscribe(
            (imagenData) => {
              this.grupo.imagenBase64 = imagenData.datosBase64;
              this.grupo.tipoArchivo = imagenData.tipoArchivo;
              this.imagenPreview = `data:${this.grupo.tipoArchivo};base64,${this.grupo.imagenBase64}`;
            },
            (error) => {
              console.log('Error al obtener la imagen del grupo seleccionado', error);
            }
          )
        }
      },
      (error) => {
        console.error('Se produjo un error al tratar cargar el grupo seleccionado', error);
      }
    );
  }

  onSubmit(form: NgForm): void {
    if (this.isEditing) {
      this.updateGrupo();
    } else {
      this.crearGrupo();
    }
  }

  private crearGrupo(): void {
    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe(
        (imagenResponse) => {

          const idImagen = imagenResponse.id;
          // BUG 2 FIX: formatear desde la variable Date usando cast indicado por el usuario
          const fechaFormateada = this.FormatDate(
            this.fechaCreacionDate instanceof Date
              ? this.fechaCreacionDate.toISOString().split('T')[0]
              : ''
          );
          let fechaCierre = null;
          if (this.fechaFinalizacionDate != null) {
            fechaCierre = this.FormatDate(
              this.fechaFinalizacionDate instanceof Date
                ? this.fechaFinalizacionDate.toISOString().split('T')[0]
                : ''
            );
          }

          const nuevoGrupo: GrupoDTO = {
            categoria: this.categoriaGrupo!,
            curso: this.cursoGrupo!,
            anio: null,
            iterable: null,
            imagenGrupo: idImagen,
            idInstructor: this.grupo.idInstructor,
            cupos: this.grupo.cupos,
            fechaCreacion: fechaFormateada,
            fechaFinalizacion: fechaCierre,
            fechaInscripcionApertura: null,
            fechaIncripcionCierre: null,
          }
          this.grupoService.createGrupo(nuevoGrupo).subscribe(
            (response) => {
              this.dialogRef.close(true);
            },
            (error) => {
              console.error('Error al crear el grupo deportivo', error);
            }
          );
        }
      )
    }
  }

  private updateGrupo(): void {
    const payload: GrupoDTO = {
      categoria: this.categoriaGrupo!,
      curso: this.cursoGrupo!,
      anio: this.grupo.anio,
      iterable: this.grupo.iterable,
      idInstructor: this.grupo.idInstructor ?? null,
      cupos: this.grupo.cupos,
      fechaCreacion: this.grupo.fechaCreacion,
      fechaFinalizacion: this.grupo.fechaFinalizacion ?? null,
    };

    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe(
        (imagenResponse) => {
          this.grupoService.updateGrupo(
            this.categoriaGrupo!, this.cursoGrupo!,
            this.grupo.anio!, this.grupo.iterable!,
            { ...payload, imagenGrupo: imagenResponse.id }
          ).subscribe(
            () => { this.dialogRef.close(true); },
            (error) => { console.error('Error al actualizar el grupo', error); }
          );
        }
      );
    } else {
      this.grupoService.updateGrupo(
        this.categoriaGrupo!, this.cursoGrupo!,
        this.grupo.anio!, this.grupo.iterable!,
        payload
      ).subscribe(
        () => { this.dialogRef.close(true); },
        (error) => { console.error('Error al actualizar el grupo', error); }
      );
    }
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

  private FormatDate(fecha: string): string {
    return this.datepipe.transform(fecha, 'yyyy-MM-dd')!;
  }

  validarFechaCreacion = (fecha: Date | null): boolean => {
    return !fecha || fecha <= this.fechaActual;
  }

  validarFechaCierre = (fecha: Date | null): boolean => {
    return !fecha || fecha >= this.fechaActual;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
