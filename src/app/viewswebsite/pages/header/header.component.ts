import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { etiquetaRol, leerTipoVinculoGuardado } from 'src/app/shared/rol-usuario';

const URL_VICERRECTORIA = 'https://vicecultura.unicauca.edu.co/viceculturav2/divisiones/deporte/deportiva';

/** Barra para visitantes (sin menú lateral). En móvil los enlaces se recogen detrás de un botón. */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit {
  readonly urlVicerrectoria = URL_VICERRECTORIA;

  perfil: string = '';
  /** Rol que se muestra: para Alumno, su tipo de vínculo (Estudiante, Docente...). */
  etiqueta = '';
  menuAbierto = false;

  constructor(
    private router: Router,
    private perfilService: PerfilService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
      this.etiqueta = etiquetaRol(perfil, leerTipoVinculoGuardado());
    });
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarSesion(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
