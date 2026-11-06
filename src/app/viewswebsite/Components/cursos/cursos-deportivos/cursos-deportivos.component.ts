import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
/**Dependencia Material */
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { DialogComponent } from '../../dialog/dialog.component';
import { MatDialog, MatDialogModule, } from '@angular/material/dialog';
import { FormCursoDeportiviComponent } from '../../cursos/form-curso-deportivo/form-curso-deportivi.component';
import { FormInscripcionesComponent } from '../../usuarios/form-inscripciones/form-inscripciones.component';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { InformacionDialogComponent } from '../../dialog/informacion-dialog.component';
import { IconoEngranajeComponent } from 'src/app/shared/icono-engranaje/icono-engranaje.component';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';
import { CategoriaDTO } from 'src/app/Models/DTOs/categoria-dto';
import { CategoriaService } from 'src/app/services/categoria.service';
import { claseEstadoInscripciones, textoEstadoInscripciones } from 'src/app/shared/estado-inscripciones';
import { FILTROS_PUBLICO, FiltroPublico, etiquetaPublico, filtrarPorPublico } from 'src/app/shared/publico-curso';
import { PerfilService } from 'src/app/services/perfil.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

@Component({
  selector: 'app-cursos-deportivos',
  standalone: true,
  templateUrl: './cursos-deportivos.component.html',
  styleUrls: ['./cursos-deportivos.component.css'],
  imports: [
    CommonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    IconoEngranajeComponent,
    //DialogComponent,
    MatDialogModule,
    //FormularioComponent,
    SidenavComponent,
    MatNativeDateModule,
    MatDatepickerModule,
    MatInputModule,
    MatSnackBarModule,

  ],
})
export class CursosDeportivosComponent implements OnInit {
  public cursos: CursoDTO[] = [];
  readonly filtrosPublico = FILTROS_PUBLICO;
  filtroPublico: FiltroPublico = 'TODOS';
  busqueda = '';
  categorias: CategoriaDTO[] = [];
  public titulo: string | null = null;
  perfil?: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cursoService: CursodeportivoService,
    private dialog: MatDialog,
    private perfilService: PerfilService,
    private imagenServise: ImagenService,
    private notificaciones: NotificacionService,
    private categoriaService: CategoriaService,
  ) { }

  ngOnInit(): void {
    this.titulo = this.route.snapshot.paramMap.get('identificador');

    this.categoriaService.getCategorias().subscribe({
      next: (categorias) => (this.categorias = categorias),
      error: () => (this.categorias = []),
    });

    this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
      if (this.titulo) {
        this.loadCursos(this.titulo);
      }
    });
  }

  /** Quien gestiona cursos (no el Alumno) puede filtrar por a quién van dirigidos. */
  get mostrarFiltroPublico(): boolean {
    return !!this.perfil && this.perfil !== 'Alumno';
  }

  /** Categoría que se está viendo (nombre y descripción reales); undefined mientras carga la lista. */
  get categoria(): CategoriaDTO | undefined {
    return this.categorias.find(c => c.titulo === this.titulo);
  }

  /** Cursos del público elegido cuyo nombre o línea deportiva contiene el texto buscado (sin tildes ni mayúsculas). */
  get cursosVisibles(): CursoDTO[] {
    const texto = normalizar(this.busqueda);
    return filtrarPorPublico(this.cursos, this.filtroPublico)
      .filter(c => !texto || normalizar(c.nombre).includes(texto) || normalizar(c.deporte).includes(texto));
  }

  get cursosConInscripciones(): number {
    return this.cursos.filter(c => c.estadoInscripciones === 'ABIERTO').length;
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda = valor ?? '';
  }

  volver(evento?: Event): void {
    evento?.preventDefault();
    void this.router.navigate(['/home']);
  }

  /** Cambia de categoría sin salir de la vista: actualiza la URL, limpia filtros y recarga los cursos. */
  cambiarCategoria(titulo: string): void {
    if (!titulo || titulo === this.titulo) return;
    this.titulo = titulo;
    this.busqueda = '';
    this.filtroPublico = 'TODOS';
    void this.router.navigate(['/cursos_deportivos', titulo]);
    this.loadCursos(titulo);
  }

  textoEstadoCurso(estado?: string | null): string {
    if (estado === 'ACTIVO') return 'Activo';
    if (estado === 'INACTIVO') return 'Inactivo';
    if (estado === 'CERRADO') return 'Cerrado';
    return 'Sin estado';
  }

  cambiarFiltroPublico(valor: string): void {
    this.filtroPublico = FILTROS_PUBLICO.some(f => f.valor === valor) ? (valor as FiltroPublico) : 'TODOS';
  }

  textoPublico(valor?: string | null): string {
    return etiquetaPublico(valor);
  }

  // El estado de inscripciones del curso lo calcula el backend con sus grupos.
  readonly textoEstadoInscripciones = textoEstadoInscripciones;
  readonly claseEstadoInscripciones = claseEstadoInscripciones;

  private loadCursos(categoria: any): void {
    const request$ = this.perfil === 'Coordinador'
      ? this.cursoService.getTodosCursosDeCategoria(categoria)
      : this.cursoService.getCursos(categoria);

    request$.subscribe(
      (cursotemp) => {
        this.cursos = cursotemp;

        this.cursos.forEach(
          (itemCurso) => {
            if (itemCurso.idImagen != null) {
              this.imagenServise.getimagen(itemCurso.idImagen).subscribe(
                (imagenData) => {
                  itemCurso.imagenBase64 = imagenData.datosBase64;
                  itemCurso.tipoArchivo = imagenData.tipoArchivo;
                },
                (error) => {
                  console.error(`Error al obtener la imagen del curso ${itemCurso.nombre}`, error);
                }
              );
            }
          }
        );
      },
      (error) => {
        console.error('Error al obtener los cursos', error);
        this.notificaciones.error('No se pudieron cargar los cursos', 'Revise su conexión e intente de nuevo.');
      }
    );
  }

  /** Información del curso en un diálogo de Material (centrado y responsive), con acceso directo a sus grupos. */
  verInformacion(item: CursoDTO): void {
    this.dialog.open(InformacionDialogComponent, {
      data: {
        etiqueta: 'Curso deportivo',
        titulo: item.nombre,
        descripcion: item.descripcion,
        imagen: item.imagenBase64 ? `data:${item.tipoArchivo};base64,${item.imagenBase64}` : null,
        datos: [
          { rotulo: 'Categoría', valor: item.categoriaCurso },
          { rotulo: 'Dirigido a', valor: etiquetaPublico(item.publico) },
        ],
        textoAccion: 'Ver grupos',
      },
    }).afterClosed().subscribe((resultado) => {
      if (resultado === 'accion') {
        this.gruposCurso(item.categoriaCurso, item.nombre);
      }
    });
  }

  gruposCurso(categoria: string, curso: string) {
    void this.router.navigate(['/list-grupos', categoria, curso]);
  }

  inscribirseAcurso(): void {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      /*data: {name: this.name(), animal: this.animal()},*/
    });
  }

  registroDeporte(): void {
    const dialogRef = this.dialog.open(FormCursoDeportiviComponent, {

      data: { tituloCategoria: this.titulo },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCursos(this.titulo);
        this.notificaciones.exito('Curso creado', 'El curso se registró y ya aparece en la categoría.');
      }
    });
  }

  onUpdate(nombrecurso: string) {
    const dialogRef = this.dialog.open(FormCursoDeportiviComponent, {
      data: { tituloCategoria: this.titulo, nombrecurso },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadCursos(this.titulo);
        this.notificaciones.exito('Curso actualizado', `Los cambios de «${nombrecurso}» se guardaron correctamente.`);
      }
    });
  }

  onDelete(nombreElemento: string): void {
    if (!this.titulo) {
      console.warn('No se puede eliminar el curso: la categoría no está definida.');
      return;
    }
    let elemento: string = ' el curso ';
    const dialogRef = this.dialog.open(DialogComponent, {
      data: { elemento, nombreElemento, tipoElemento: 'curso', categoria: this.titulo },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmado) {
        this.loadCursos(this.titulo);
        this.notificaciones.exito('Curso eliminado', `«${nombreElemento}» ya no aparece en la categoría.`);
      } else if (result?.errorStatus !== undefined) {
        const status = result.errorStatus;
        if (status === 409) {
          this.notificaciones.error('No se pudo eliminar el curso', 'El curso ya se encuentra eliminado.');
        } else if (status === 404) {
          this.notificaciones.error('No se pudo eliminar el curso', 'El curso no existe.');
        } else {
          this.notificaciones.error('No se pudo eliminar el curso', 'Ocurrió un error, intente de nuevo.');
        }
      }
    });
  }

  // TODO (sprint futuro): revisar si 'Habilitar' debería poder
  // reactivar un curso en estado CERRADO (eliminado lógicamente),
  // o si eliminar y deshabilitar deberían ser flujos completamente
  // separados. Decisión consciente tomada el 2026-07-09: se permite
  // por ahora, solo accesible para rol Administrador.
  toggleEstadoCurso(item: CursoDTO): void {
    if (!this.titulo) return;
    const nuevoEstado = item.estadoCurso === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.cursoService.cambiarEstadoCurso(this.titulo, item.nombre, nuevoEstado).subscribe({
      next: (updated) => {
        item.estadoCurso = updated.estadoCurso;
        const accion = updated.estadoCurso === 'ACTIVO' ? 'habilitado' : 'deshabilitado';
        this.notificaciones.exito(`Curso ${accion}`, `«${item.nombre}» fue ${accion} correctamente.`);
      },
      error: () => {
        this.notificaciones.error('No se pudo cambiar el estado', 'No se pudo cambiar el estado del curso, intente de nuevo.');
      },
    });
  }
}

function normalizar(valor?: string | null): string {
  return (valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
