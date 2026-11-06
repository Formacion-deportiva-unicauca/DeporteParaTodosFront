import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';

export type TipoNotificacion = 'exito' | 'error' | 'info';

export interface DatosNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje?: string;
}

const ICONOS: Record<TipoNotificacion, string> = {
  exito: 'check_circle',
  error: 'error_outline',
  info: 'info',
};

/** Contenido de la notificación: icono, título, mensaje y botón de cerrar. Se abre con NotificacionService. */
@Component({
  selector: 'app-notificacion',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './notificacion.component.html',
  styleUrls: ['./notificacion.component.css'],
})
export class NotificacionComponent {
  constructor(
    @Inject(MAT_SNACK_BAR_DATA) public datos: DatosNotificacion,
    private referencia: MatSnackBarRef<NotificacionComponent>,
  ) {}

  get icono(): string {
    return ICONOS[this.datos.tipo];
  }

  cerrar(): void {
    this.referencia.dismiss();
  }
}
