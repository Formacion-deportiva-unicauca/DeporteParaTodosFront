import { Component, inject, OnInit } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { etiquetaRol, leerTipoVinculoGuardado, tituloPanel } from 'src/app/shared/rol-usuario';

/** Por debajo de este ancho (escritorio = 992px o más) el menú lateral se recoge detrás de un botón. */
export const CONSULTA_MENU_RECOGIDO = '(max-width: 991.98px)';
/** Alto de la barra superior; el panel lateral empieza justo debajo. */
export const ALTO_BARRA_PX = 64;

const URL_VICERRECTORIA = 'https://vicecultura.unicauca.edu.co/viceculturav2/divisiones/deporte/deportiva';

/** Estructura de las pantallas internas: barra superior institucional + menú lateral por rol + contenido. */
@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.css'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatSidenavModule,
    MatIconModule,
    MatMenuModule,
    AsyncPipe,
    CommonModule,
    RouterLink,
    RouterLinkActive,
  ],
})
export class SidenavComponent implements OnInit {
  readonly altoBarra = ALTO_BARRA_PX;
  readonly urlVicerrectoria = URL_VICERRECTORIA;

  perfil?: string;
  /** Rol que se muestra: Coordinador, Instructor o, para Alumno, su tipo de vínculo (Estudiante, Docente...). */
  etiqueta = '';
  nombreUsuario = '';
  esMovil = false;

  private breakpointObserver = inject(BreakpointObserver);

  isHandset$: Observable<boolean> = this.breakpointObserver
    .observe(CONSULTA_MENU_RECOGIDO)
    .pipe(
      map((result) => result.matches),
      shareReplay()
    );

  constructor(
    private router: Router,
    private perfilservice: PerfilService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.isHandset$.subscribe(movil => { this.esMovil = movil; });
    this.perfilservice.perfil$.subscribe(perfil => {
      this.perfil = perfil;
      this.etiqueta = etiquetaRol(perfil, leerTipoVinculoGuardado());
      this.nombreUsuario = this.leerNombre();
    });
  }

  get tituloPanel(): string {
    return tituloPanel(this.perfil, leerTipoVinculoGuardado());
  }

  /** Iniciales para el avatar; "?" si todavía no hay nombre. */
  get iniciales(): string {
    const partes = this.nombreUsuario.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
      return '?';
    }
    const primera = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primera + ultima).toUpperCase();
  }

  /** Al elegir una opción en móvil, el panel se cierra para dejar ver el contenido. */
  alNavegar(panel: MatSidenav): void {
    if (this.esMovil) {
      void panel.close();
    }
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  private leerNombre(): string {
    const claims = this.authService.getProfile() as { name?: string } | null;
    return claims?.name ?? '';
  }
}
