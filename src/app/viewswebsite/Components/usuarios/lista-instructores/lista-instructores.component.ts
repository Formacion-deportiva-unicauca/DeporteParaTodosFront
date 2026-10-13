import { AfterViewInit, Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SidenavComponent } from '../../../pages/sidenav/sidenav.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { FormInscripcionesComponent } from '../form-inscripciones/form-inscripciones.component';
import { DialogComponent } from '../../dialog/dialog.component';
import { FormInstructorComponent, ResultadoFormInstructor } from '../form-instructor/form-instructor.component';
import { FormPlazoCargaComponent, ResultadoFormPlazoCarga } from '../form-plazo-carga/form-plazo-carga.component';
import { PlazoCargaDTO } from 'src/app/Models/DTOs/plazo-carga-dto';
import { formatearFecha } from 'src/app/shared/fecha-grupo.util';
import { iconoReporte, textoAvisoReportes, textoBotonPlazo, textoReporte } from 'src/app/shared/plazo-carga.util';

@Component({
  selector: 'app-lista-instructores',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    SidenavComponent,
    MatDialogModule,
    MatSnackBarModule,
    FormsModule,
    RouterLink,
  ],
  templateUrl: './lista-instructores.component.html',
  styleUrls: ['./lista-instructores.component.css'],
})
export class ListaInstructoresComponent implements OnInit, AfterViewInit, OnDestroy {

  instructores: InstructorDTO[] = [];
  dataSource = new MatTableDataSource<InstructorDTO>([]);
  filtro = '';
  @ViewChild(MatSort) sort!: MatSort;
  perfil: string = '';

  isButtonEnabled = false;
  checked = false;
  private readonly columnasBase = ['Identificacion', 'Nombre', 'Correo', 'Acciones'];
  private readonly columnasCoordinador = ['Identificacion', 'Nombre', 'Correo', 'Reporte', 'Acciones'];
  displayedColumns: string[] = this.columnasBase;

  // Plazos de carga por instructor (solo Coordinador), unidos a la lista por idInstructor.
  plazos = new Map<string, PlazoCargaDTO>();
  cargandoPlazos = false;
  errorPlazos = false;

  readonly textoReporte = textoReporte;
  readonly iconoReporte = iconoReporte;
  readonly textoBotonPlazo = textoBotonPlazo;

  private perfilSub: Subscription = Subscription.EMPTY;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private instructorservice: InstructorServisce,
    private perfilService: PerfilService,
  ) { }

  ngOnInit(): void {
    this.perfilSub = this.perfilService.perfil$.pipe(distinctUntilChanged()).subscribe(p => {
      this.perfil = p;
      // Guarda de rol: solo el Coordinador ve la columna y pide los plazos.
      this.displayedColumns = p === 'Coordinador' ? this.columnasCoordinador : this.columnasBase;
      if (p === 'Coordinador') {
        this.cargarPlazos();
      } else {
        this.plazos = new Map();
        this.cargandoPlazos = false;
        this.errorPlazos = false;
      }
    });
    // Coincidencia por subcadena en id, nombre o correo, sin mayúsculas ni tildes.
    this.dataSource.filterPredicate = (i, filtro) =>
      [i.id, i.nombre, i.correo].some(campo => this.normalizar(campo).includes(filtro));
    // Ordena también sin tildes ("Ándres" junto a la A).
    this.dataSource.sortingDataAccessor = (i, columna) => {
      switch (columna) {
        case 'Identificacion': return this.normalizar(i.id);
        case 'Nombre': return this.normalizar(i.nombre);
        case 'Correo': return this.normalizar(i.correo);
        default: return '';
      }
    };
    this.cargarInstructores();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  private cargarInstructores(): void {
    this.instructorservice.getInstructores().subscribe(
      (instructores: any) => {
        this.instructores = Array.isArray(instructores) ? instructores : [];
        // Reasignar los datos conserva el filtro y el orden vigentes (también tras eliminar).
        this.dataSource.data = this.instructores;
      }
    );
  }

  /** Petición independiente de la lista: si falla, la lista se ve igual con "—" y un aviso propio. */
  private cargarPlazos(): void {
    this.cargandoPlazos = true;
    this.errorPlazos = false;
    this.instructorservice.getPlazosCarga().subscribe({
      next: lista => {
        this.plazos = new Map((Array.isArray(lista) ? lista : []).map(p => [p.idInstructor, p] as [string, PlazoCargaDTO]));
        this.cargandoPlazos = false;
      },
      error: () => {
        this.plazos = new Map();
        this.cargandoPlazos = false;
        this.errorPlazos = true;
      },
    });
  }

  plazoDe(id: string): PlazoCargaDTO | undefined {
    return this.plazos.get(id);
  }

  /** Aviso sobre la tabla; los plazos de instructores que no están en la lista se ignoran. */
  get textoAviso(): string | null {
    if (this.perfil !== 'Coordinador' || this.cargandoPlazos || this.errorPlazos) return null;
    const delasFilas = this.instructores
      .map(i => this.plazos.get(i.id))
      .filter((p): p is PlazoCargaDTO => !!p);
    return textoAvisoReportes(delasFilas);
  }

  asignarPlazo(instructor: InstructorDTO): void {
    const plazo = this.plazoDe(instructor.id);
    if (!plazo) return;
    const dialogRef = this.dialog.open(FormPlazoCargaComponent, {
      data: {
        id: instructor.id,
        nombre: instructor.nombre,
        fechaActual: plazo.fechaLimite,
        estado: plazo.estadoReporte,
        plazoVencido: plazo.plazoVencido,
        anio: plazo.anio,
        periodo: plazo.periodo,
      },
    });
    dialogRef.afterClosed().subscribe((resultado?: ResultadoFormPlazoCarga) => {
      if (!resultado) return;
      if ('yaNoExiste' in resultado) {
        this.snackBar.open('El instructor ya no existe', '', { duration: 3000, panelClass: 'snack-error' });
        this.cargarInstructores();
        this.cargarPlazos();
        return;
      }
      // Solo cambia esa entrada: las filas no se vuelven a crear (se conservan filtro, orden y foco).
      this.plazos = new Map(this.plazos).set(resultado.idInstructor, resultado);
      this.snackBar.open(`Plazo asignado hasta ${formatearFecha(resultado.fechaLimite)}`, '', { duration: 3000, panelClass: 'snack-success' });
    });
  }

  private normalizar(valor: string | null | undefined): string {
    return (valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  onFiltroChange(valor: string): void {
    this.filtro = valor;
    this.dataSource.filter = this.normalizar(valor);
  }

  limpiarBusqueda(): void {
    this.onFiltroChange('');
  }

  get sinCoincidencias(): boolean {
    return this.instructores.length > 0 && this.dataSource.filteredData.length === 0;
  }

  get hayFilas(): boolean {
    return this.dataSource.filteredData.length > 0;
  }

  /** Texto para la región aria-live: cantidad, sin coincidencias o lista vacía. */
  get textoEstado(): string {
    if (this.instructores.length === 0) return 'No hay instructores registrados';
    const n = this.dataSource.filteredData.length;
    if (n === 0) return 'Ningún instructor coincide con la búsqueda';
    return `${n} ${n === 1 ? 'instructor' : 'instructores'}`;
  }

  registroInstructor() {
    const dialogRef = this.dialog.open(FormInscripcionesComponent, {
      data: { rol: 'Instructor' }
    });
    dialogRef.afterClosed().subscribe((resultado) => {
      if (resultado?.confirmacionCreacion) {
        this.cargarInstructores();
      }
    });
  }

  editarInstructor(instructor: InstructorDTO): void {
    const dialogRef = this.dialog.open(FormInstructorComponent, {
      data: { id: instructor.id, nombre: instructor.nombre, correo: instructor.correo }
    });
    dialogRef.afterClosed().subscribe((resultado?: ResultadoFormInstructor) => {
      if (!resultado) return;
      if ('yaNoExiste' in resultado) {
        this.snackBar.open('El instructor ya no existe', '', { duration: 3000, panelClass: 'snack-error' });
        this.cargarInstructores();
        return;
      }
      // Reemplazar la fila conserva el filtro y el orden vigentes (MatTableDataSource los reaplica).
      this.instructores = this.instructores.map(i => i.id === resultado.id ? { ...i, ...resultado } : i);
      this.dataSource.data = this.instructores;
      this.snackBar.open('Instructor actualizado', '', { duration: 3000, panelClass: 'snack-success' });
    });
  }

  onDelete(instructor: InstructorDTO): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        elemento: instructor.nombre,
        nombreElemento: instructor.nombre,
        tipoElemento: 'instructor',
        instructorId: instructor.id,
      }
    });
    dialogRef.afterClosed().subscribe((resultado) => {
      if (!resultado) return;
      if (resultado.confirmado) {
        this.cargarInstructores();
        this.snackBar.open('Instructor eliminado', '', { duration: 3000, panelClass: 'snack-success' });
      } else {
        const msg = resultado.errorStatus === 409
          ? 'El instructor ya se encuentra eliminado'
          : 'Error al eliminar el instructor';
        this.snackBar.open(msg, '', { duration: 3000, panelClass: 'snack-error' });
      }
    });
  }
}
