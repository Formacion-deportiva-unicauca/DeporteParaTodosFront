import { Component, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/services/auth.service';
import { FooterComponent, URL_POLITICA_DATOS } from '../footer/footer.component';
import { BotonGoogleComponent } from './boton-google/boton-google.component';

/** Si la página no cambia en este tiempo tras el clic, se vuelve a habilitar el botón. */
const ESPERA_REDIRECCION_MS = 10000;

/** Pantalla de entrada: único acceso con la cuenta institucional de Google. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, MatIconModule, FooterComponent, BotonGoogleComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnDestroy {
  readonly urlPoliticaDatos = URL_POLITICA_DATOS;

  /** true desde el clic hasta que el navegador sale hacia Google. */
  iniciando = false;
  errorConexion = false;

  private temporizador?: ReturnType<typeof setTimeout>;

  constructor(private authGoogleService: AuthService) { }

  async login(): Promise<void> {
    if (this.iniciando) {
      return;
    }
    this.iniciando = true;
    this.errorConexion = false;
    this.temporizador = setTimeout(() => this.reiniciar(), ESPERA_REDIRECCION_MS);
    try {
      await this.authGoogleService.login();
    } catch {
      this.reiniciar();
      this.errorConexion = true;
    }
  }

  /**
   * Al volver con "atrás" desde Google, el navegador restaura la página tal como estaba (con el botón en
   * "Redirigiendo…"); se reinicia el estado para que el botón no quede bloqueado.
   */
  @HostListener('window:pageshow', ['$event'])
  alMostrarPagina(evento: PageTransitionEvent): void {
    if (evento.persisted) {
      this.reiniciar();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
  }

  private reiniciar(): void {
    clearTimeout(this.temporizador);
    this.iniciando = false;
    this.authGoogleService.reiniciarLogin();
  }
}
