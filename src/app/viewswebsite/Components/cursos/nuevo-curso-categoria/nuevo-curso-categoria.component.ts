import { MatButtonModule } from '@angular/material/button';
import { Component, ElementRef, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, NgForm } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { ImagenService } from 'src/app/services/imagen.service';
import { Observable, catchError, map, of, switchMap, throwError } from 'rxjs';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { validarImagen } from 'src/app/shared/imagen-subida';

@Component({
  selector: 'app-nuevo-curso-categoria',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './nuevo-curso-categoria.component.html',
  styleUrls: ['./nuevo-curso-categoria.component.css'],
})
export class NuevoCursoCategoriaComponent implements OnInit {
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  /** true mientras se envía: el botón se deshabilita y no admite un segundo envío. */
  guardando = false;
  /** Motivo por el que se rechazó la última imagen elegida (tipo o tamaño); vacío si no hay problema. */
  errorImagen = '';
  /** true tras el primer intento de enviar: a partir de ahí se muestran los campos que faltan. */
  private intentoEnvio = false;
  /** Mensaje del servidor para mostrar dentro del diálogo; vacío si no hay error. */
  errorServidor = '';

  categoria: CategoriaDTO = {
    titulo: '',
    descripcion: '',
    imagenId: null,
  };

  constructor(
    private categoriaService: CategoriaService,
    private imagenService: ImagenService,
    private dialogRef: MatDialogRef<NuevoCursoCategoriaComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { titulo: string },
    private notificaciones: NotificacionService,
    private anfitrion: ElementRef<HTMLElement>,
  ) { }

  ngOnInit(): void {
    if (this.data && this.data.titulo) {
      this.isEditing = true;
      this.loadCategoria(this.data.titulo);
    }
  }

  loadCategoria(titulo: string): void {
    this.categoriaService.getCategoria(titulo).subscribe(
      (categoria) => {
        this.categoria = categoria;
        if (categoria.imagenId != null) {
          this.imagenService.getimagen(categoria.imagenId).subscribe(
            (imagenData) => {
              categoria.imagenBase64 = imagenData.datosBase64;
              categoria.tipoArchivo = imagenData.tipoArchivo;
              this.imagenPreview = `data:${categoria.tipoArchivo};base64,${categoria.imagenBase64}`;
            },
            (error) => {
              console.error(`Error al obtener la imagen de la categoría  ${categoria.titulo}`, error);
            }
          )
        }
      },
      (error) => console.error('Error al cargar la categoría', error)
    );
  }

  /** El servidor exige imagen de portada al crear (al editar se conserva la actual). */
  get faltaImagen(): boolean {
    return this.intentoEnvio && !this.isEditing && !this.selectedFile;
  }

  onSubmit(form: NgForm): void {
    if (this.guardando) {
      return;
    }
    this.intentoEnvio = true;
    if (form.invalid || this.faltaImagen) {
      // Muestra bajo cada campo qué falta, en lugar de dejar el botón sin explicación.
      form.control.markAllAsTouched();
      this.mostrarPrimerError();
      return;
    }
    this.guardando = true;
    this.errorServidor = '';
    this.idImagen$().pipe(
      switchMap(imagenId => this.guardarCategoria(imagenId)),
    ).subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => {
        this.guardando = false;
        this.errorServidor = err?.message === 'imagen'
          ? 'No se pudo subir la imagen. Intente con otro archivo.'
          : 'No se pudo guardar la categoría. Intente de nuevo.';
        // Además del aviso dentro del diálogo, una notificación para que el resultado no pase desapercibido.
        this.notificaciones.error(
          this.isEditing ? 'No se pudo actualizar la categoría' : 'No se pudo crear la categoría',
          this.errorServidor,
        );
      },
    });
  }

  /**
   * El primer error puede quedar fuera de la vista (el cuerpo del diálogo se desplaza, y la imagen está abajo):
   * se lleva a la vista para que el usuario sepa por qué no se guardó.
   */
  private mostrarPrimerError(): void {
    setTimeout(() => {
      this.anfitrion.nativeElement
        .querySelector<HTMLElement>('.mat-form-field-invalid, .error-campo')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  /** Sube la imagen elegida (si hay) y devuelve su id; sin imagen nueva conserva la actual al editar. */
  private idImagen$(): Observable<number | null | undefined> {
    if (this.selectedFile) {
      return this.imagenService.postImagen(this.selectedFile).pipe(
        map(respuesta => respuesta.id),
        catchError(() => throwError(() => new Error('imagen'))),
      );
    }
    return of(this.isEditing ? this.categoria.imagenId : undefined);
  }

  private guardarCategoria(imagenId: number | null | undefined): Observable<CategoriaDTO> {
    const categoria: CategoriaDTO = {
      titulo: this.categoria.titulo,
      descripcion: this.categoria.descripcion,
      ...(imagenId !== undefined ? { imagenId } : {}),
    };
    return this.isEditing
      ? this.categoriaService.updateCategoria(this.categoria.titulo, categoria)
      : this.categoriaService.createCategoria(categoria);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const motivo = validarImagen(input.files[0]);
      if (motivo) {
        // Se avisa antes de subir: un archivo que no es imagen o es muy pesado fallaría con un error genérico.
        this.errorImagen = motivo;
        input.value = '';
        return;
      }
      this.errorImagen = '';
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
