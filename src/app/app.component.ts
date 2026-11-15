import { Component } from '@angular/core';
import { AuthService } from './services/auth.service';
import { InactividadService } from './shared/inactividad.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'deporteParaTodos';

  // Inyectar AuthService aquí garantiza que initLogin() se ejecute al arrancar
  // la app en cualquier ruta, incluyendo el redirect de Google a /home con ?code=.
  // Antes solo se instanciaba en LoginComponent, que se destruye con el redirect.
  // InactividadService se activa y se detiene solo según el estado de la sesión; inyectarlo aquí lo crea al arrancar.
  constructor(private authService: AuthService, private inactividad: InactividadService) {}
}
