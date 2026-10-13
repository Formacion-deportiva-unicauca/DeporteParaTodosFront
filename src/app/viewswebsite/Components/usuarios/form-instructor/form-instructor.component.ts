import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';

export interface DatosFormInstructor {
  id: string;
  nombre: string;
  correo: string;
}

/** El instructor ya no existe (404): quien abrió el diálogo debe recargar. */
export interface InstructorYaNoExiste {
  yaNoExiste: true;
}

/** Resultado de cerrar el diálogo: el instructor actualizado, la señal de recarga, o undefined si se canceló. */
export type ResultadoFormInstructor = InstructorDTO | InstructorYaNoExiste;

/** Obligatorio, y no se acepta solo espacios. */
const noVacio: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  ((c.value ?? '') as string).trim() ? null : { required: true };

/**
 * Editar el nombre de un instructor (Coordinador). Se abre como diálogo desde la lista y desde el detalle.
 * El correo se muestra pero NO se puede editar (campo deshabilitado); el PUT envía el correo original.
 * Trabaja sobre una copia: el objeto recibido nunca se modifica; quien lo abrió actualiza sus datos con el resultado.
 */
@Component({
  selector: 'app-form-instructor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './form-instructor.component.html',
  styleUrls: ['./form-instructor.component.css'],
})
export class FormInstructorComponent {
  form = this.fb.nonNullable.group({
    nombre: [this.data.nombre, [noVacio]],
    correo: [{ value: this.data.correo, disabled: true }],
  });
  guardando = false;
  errorServidor: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DatosFormInstructor,
    private dialogRef: MatDialogRef<FormInstructorComponent, ResultadoFormInstructor>,
    private instructorService: InstructorServisce,
    private fb: FormBuilder,
  ) {}

  private get nombre(): string {
    return this.form.controls.nombre.value.trim();
  }

  get hayCambios(): boolean {
    return this.nombre !== this.data.nombre.trim();
  }

  get puedeGuardar(): boolean {
    return this.form.valid && this.hayCambios && !this.guardando;
  }

  guardar(): void {
    // `guardando` se activa de forma síncrona: una segunda pulsación no envía otra petición.
    if (!this.puedeGuardar) return;
    this.guardando = true;
    this.errorServidor = null;
    // El backend espera { nombre, correo }: el correo va siempre el original, nunca el del campo.
    this.instructorService.actualizarInstructor(this.data.id, { nombre: this.nombre, correo: this.data.correo.trim() }).subscribe({
      next: instructor => this.dialogRef.close(instructor),
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        switch (err?.status) {
          case 404:
            this.errorServidor = 'El instructor ya no existe';
            this.dialogRef.close({ yaNoExiste: true });
            break;
          case 409:
            this.errorServidor = err.error?.mensaje ?? 'El correo ya está en uso por otro usuario';
            break;
          case 400:
            this.errorServidor = 'Los datos no son válidos. Revisa el nombre.';
            break;
          default:
            this.errorServidor = 'No se pudo guardar. Intenta de nuevo.';
        }
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
