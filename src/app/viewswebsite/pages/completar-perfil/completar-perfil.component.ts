import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subscription } from 'rxjs';
import { PerfilService } from 'src/app/services/perfil.service';
import { PerfilDTO } from 'src/app/Models/DTOs/perfil-tdo';
import { CatalogoService } from 'src/app/services/catalogo.service';
import {
  TIPOS_VINCULO,
  datosSegunTipo,
  requiereCodigo,
  requiereDependencia,
  requiereFacultadYPrograma,
} from 'src/app/shared/tipo-vinculo';

@Component({
  selector: 'app-completar-perfil',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatSnackBarModule,
  ],
  templateUrl: './completar-perfil.component.html',
  styleUrls: ['./completar-perfil.component.css'],
})
export class CompletarPerfilComponent implements OnInit, OnDestroy {
  readonly tiposDocumento: string[] = ['CC', 'TI', 'CE', 'PP', 'PEP', 'DIE'];
  readonly opcSexo: string[] = ['M', 'F'];
  readonly tiposVinculo: string[] = TIPOS_VINCULO;

  facultades: string[] = [];
  programas: string[] = [];
  /** La facultad elegida no tiene programas cargados en el catálogo. */
  sinProgramas = false;
  errorCatalogo: string | null = null;
  private facultadesSub = Subscription.EMPTY;
  private programasSub = Subscription.EMPTY;

  perfil: PerfilDTO = {
    id: 0,
    nombre: '',
    correo: '',
    tipoId: '',
    sexo: '',
    facultad: '',
    tipoAlumno: '',
    role: '',
    alumnoCodigo: '',
    programa: '',
    dependencia: '',
  };

  constructor(
    private oauthService: OAuthService,
    private perfilService: PerfilService,
    private router: Router,
    private snackBar: MatSnackBar,
    private catalogoService: CatalogoService,
  ) {}

  ngOnInit(): void {
    const claims: any = this.oauthService.getIdentityClaims();
    if (claims) {
      this.perfil.nombre = claims['name'] ?? '';
      this.perfil.correo = claims['email'] ?? '';
    }
    this.facultadesSub = this.catalogoService.getFacultades().subscribe({
      next: facultades => (this.facultades = facultades),
      error: () => (this.errorCatalogo = 'No se pudieron cargar las facultades. Intenta de nuevo más tarde.'),
    });
  }

  ngOnDestroy(): void {
    this.facultadesSub.unsubscribe();
    this.programasSub.unsubscribe();
  }

  get pideCodigo(): boolean {
    return requiereCodigo(this.perfil.tipoAlumno);
  }

  get pideFacultadYPrograma(): boolean {
    return requiereFacultadYPrograma(this.perfil.tipoAlumno);
  }

  get pideDependencia(): boolean {
    return requiereDependencia(this.perfil.tipoAlumno);
  }

  /** Al cambiar el tipo de vínculo se descartan los datos que ya no le corresponden. */
  onTipoChange(): void {
    const { alumnoCodigo, facultad, programa, dependencia } = datosSegunTipo(this.perfil);
    Object.assign(this.perfil, { alumnoCodigo, facultad, programa, dependencia });
    if (!this.pideFacultadYPrograma) {
      this.programasSub.unsubscribe();
      this.programas = [];
      this.sinProgramas = false;
    }
  }

  onFacultadChange(facultad: string): void {
    this.programasSub.unsubscribe();
    this.perfil.programa = '';
    this.programas = [];
    this.sinProgramas = false;
    this.errorCatalogo = null;
    if (!facultad) return;
    this.programasSub = this.catalogoService.getProgramas(facultad).subscribe({
      next: programas => {
        this.programas = programas;
        this.sinProgramas = programas.length === 0;
      },
      error: () => (this.errorCatalogo = 'No se pudieron cargar los programas. Intenta de nuevo.'),
    });
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) return;
    // Todos los tipos de vínculo van al mismo endpoint; role queda vacío (no es instructor del programa).
    // Solo se envían los datos que corresponden al tipo elegido.
    this.perfilService.registrarPerfil(datosSegunTipo({ ...this.perfil, role: '' })).subscribe({
      next: () => {
        this.snackBar.open('Registro exitoso, bienvenido/a', 'Cerrar', {
          duration: 4000,
          panelClass: ['snack-success'],
        });
        void this.router.navigate(['/home']);
      },
      error: err => {
        console.error('Error al completar perfil:', err);
        const mensaje = err?.status === 422 && err.error?.mensaje
          ? err.error.mensaje
          : 'No se pudo completar el registro, intenta de nuevo';
        this.snackBar.open(mensaje, 'Cerrar', {
          duration: 6000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  cancelar(): void {
    void this.oauthService.logOut();
    void this.router.navigate(['/login']);
  }
}
