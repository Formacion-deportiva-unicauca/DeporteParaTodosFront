import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/**
 * Confirmación al registrar una clase sin ningún alumno marcado (todos quedan con falta).
 * Se hizo aparte porque DialogComponent es una confirmación de borrado con texto y botones fijos.
 * Cierra con true (continuar) o false (volver).
 */
@Component({
  selector: 'app-confirmar-sin-asistentes',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirmar-sin-asistentes.component.html',
  styleUrls: ['./confirmar-sin-asistentes.component.css'],
})
export class ConfirmarSinAsistentesComponent {
  private cerrado = false;

  constructor(private dialogRef: MatDialogRef<ConfirmarSinAsistentesComponent>) {}

  confirmar(): void {
    // Evita que un segundo clic acepte dos veces.
    if (this.cerrado) return;
    this.cerrado = true;
    this.dialogRef.close(true);
  }

  volver(): void {
    this.dialogRef.close(false);
  }
}
