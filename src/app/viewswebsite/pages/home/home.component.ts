import { Component } from '@angular/core';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
/**Angular Material */
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DialogComponent } from '../../Components/dialog/dialog.component';
import { NuevoCursoCategoriaComponent } from '../../Components/cursos/nuevo-curso-categoria/nuevo-curso-categoria.component';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { descripcionInicio, etiquetaRol, leerTipoVinculoGuardado } from 'src/app/shared/rol-usuario';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { InformacionDialogComponent } from '../../Components/dialog/informacion-dialog.component';

import { IconoEngranajeComponent } from 'src/app/shared/icono-engranaje/icono-engranaje.component';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatPaginatorModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    HeaderComponent,
    SidenavComponent,
    IconoEngranajeComponent,
  ],

  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})

export class HomeComponent {
  public listaEscenarios: CategoriaDTO[] = [];
  perfil?: string;

  constructor(
    private router: Router,
    private categoriaService: CategoriaService,
    private imagenService: ImagenService,
    private dialog: MatDialog,
    private perfilService: PerfilService,
    private tokenInterchangeService: TokenInterchangeService,
    private notificaciones: NotificacionService,
  ) { }

  ngOnInit(): void {
    if (sessionStorage.getItem('dpt_token')) {
      this.loadCategorias();
    } else {
      this.tokenInterchangeService.tokenReady$.pipe(take(1))
        .subscribe(() => this.loadCategorias());
    }
    this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
    });
  }

  /** Mensaje de bienvenida: cada rol ve lo que puede hacer (administrar, gestionar asistencia, consultar e inscribirse). */
  get descripcion(): string {
    return descripcionInicio(this.perfil);
  }

  /** Rol que se muestra: para Alumno, su tipo de vínculo (Estudiante, Docente, Administrativo, Contratista). */
  get etiquetaRol(): string {
    return etiquetaRol(this.perfil, leerTipoVinculoGuardado());
  }

  loadCategorias(): void {
    this.categoriaService.getCategorias().subscribe(
      (data) => {
        this.listaEscenarios = data;

        this.listaEscenarios.forEach((categoria) => {
          if (categoria.imagenId != null) {
            this.imagenService.getimagen(categoria.imagenId).subscribe(
              (imagenData) => {
                categoria.imagenBase64 = imagenData.datosBase64;
                categoria.tipoArchivo = imagenData.tipoArchivo;
              },
              (error) => {
                console.error(`Error al obtener la imagen de la categoría  ${categoria.titulo}`, error);
              }
            );
          }
        });
      },
      (error) => {
        console.error('Error al cargar las categorías', error);
        this.notificaciones.error('No se pudieron cargar las categorías', 'Revise su conexión e intente de nuevo.');
      }
    );
  }

  /** Información de la categoría en un diálogo de Material (centrado y responsive), con acceso directo a sus cursos. */
  verInformacion(item: CategoriaDTO): void {
    this.dialog.open(InformacionDialogComponent, {
      data: {
        etiqueta: 'Categoría deportiva',
        titulo: item.titulo,
        descripcion: item.descripcion,
        imagen: item.imagenBase64 ? `data:${item.tipoArchivo};base64,${item.imagenBase64}` : null,
        textoAccion: 'Ver cursos',
      },
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'accion') {
        this.abrirCursosDeportivos(item.titulo);
      }
    });
  }

  configurarTipoCurso() {
    void this.router.navigate(['/configuracionCatCurso']);
  }

  abrirCursosDeportivos(identificador: string): void {
    void this.router.navigate(['/cursos_deportivos', identificador]);
  }

  onUpdate(titulo: string): void {
    const dialogRef = this.dialog.open(NuevoCursoCategoriaComponent, {
      data: { titulo },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategorias();
        this.notificaciones.exito('Categoría actualizada', `Los cambios de «${titulo}» se guardaron correctamente.`);
      }
    });
  }

  onDelete(nombreElemento: string): void {
    let elemento: string = ' la categoría';
    const dialogRef = this.dialog.open(DialogComponent, {
      data: { elemento, nombreElemento, tipoElemento: 'categoria' },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.loadCategorias();
        this.notificaciones.exito('Categoría eliminada', `«${nombreElemento}» ya no aparece en el panel.`);
      } else if (result?.errorStatus !== undefined) {
        const status = result.errorStatus;
        if (status === 409) {
          this.notificaciones.error('No se pudo eliminar la categoría', 'La categoría ya se encuentra eliminada.');
        } else if (status === 404) {
          this.notificaciones.error('No se pudo eliminar la categoría', 'La categoría no existe.');
        } else {
          this.notificaciones.error('No se pudo eliminar la categoría', 'Ocurrió un error, intente de nuevo.');
        }
      }
    });
  }

  //Método para registrar una categoría
  nuevaCategoria(): void {
    const dialogRef = this.dialog.open(NuevoCursoCategoriaComponent, {
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCategorias();
        this.notificaciones.exito('Categoría creada', 'La categoría se registró y ya aparece en el panel.');
      }
    });
  }
}
