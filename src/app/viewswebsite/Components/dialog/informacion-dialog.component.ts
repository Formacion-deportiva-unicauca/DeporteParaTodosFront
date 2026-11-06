import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DatosInformacionDialog {
  /** Texto pequeño sobre el título, p. ej. "Categoría deportiva". */
  etiqueta: string;
  titulo: string;
  descripcion: string;
  /** Imagen lista para usar en src (data URL), o null. */
  imagen?: string | null;
  /** Datos adicionales como pares rótulo / valor. */
  datos?: { rotulo: string; valor: string }[];
  /** Si viene, se ofrece una acción principal; el diálogo se cierra con 'accion'. */
  textoAccion?: string;
}

/**
 * Información de una categoría o de un curso, con el diseño de diálogo del lineamiento UX-UI. Reemplaza al modal de
 * Bootstrap, que quedaba atrapado dentro del contenedor del menú lateral y aparecía pegado arriba, bajo la barra.
 */
@Component({
  selector: 'app-informacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './informacion-dialog.component.html',
  styleUrls: ['./informacion-dialog.component.css'],
})
export class InformacionDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DatosInformacionDialog) {}
}
