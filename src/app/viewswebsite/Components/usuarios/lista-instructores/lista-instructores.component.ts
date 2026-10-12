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
import { Subscription } from 'rxjs';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { FormInscripcionesComponent } from '../form-inscripciones/form-inscripciones.component';
import { DialogComponent } from '../../dialog/dialog.component';

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
  displayedColumns: string[] = ['Identificacion', 'Nombre', 'Correo', 'Acciones'];

  private perfilSub: Subscription = Subscription.EMPTY;

  constructor(
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private instructorservice: InstructorServisce,
    private perfilService: PerfilService,
  ) { }

  ngOnInit(): void {
    this.perfilSub = this.perfilService.perfil$.subscribe(p => this.perfil = p);
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
