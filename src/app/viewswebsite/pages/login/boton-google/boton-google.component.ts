import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** Botón "Ingresar con Google": primario, en píldora, con estado de carga para no aceptar clics repetidos. */
@Component({
  selector: 'app-boton-google',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boton-google.component.html',
  styleUrls: ['./boton-google.component.css'],
})
export class BotonGoogleComponent {
  /** true mientras se redirige a Google: el botón queda deshabilitado y muestra el avance. */
  @Input() cargando = false;
  @Output() pulsado = new EventEmitter<void>();
}
