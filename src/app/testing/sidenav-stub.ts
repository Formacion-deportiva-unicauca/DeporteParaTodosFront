import { Component } from '@angular/core';

/**
 * Sustituto de SidenavComponent para las pruebas de las pantallas que lo usan como contenedor.
 * Estas pruebas verifican su propia pantalla, no el menú (que tiene su spec), y el menú real
 * necesita el Router verdadero para sus enlaces.
 */
@Component({
  selector: 'app-sidenav',
  standalone: true,
  template: '<ng-content></ng-content>',
})
export class SidenavStub {}
