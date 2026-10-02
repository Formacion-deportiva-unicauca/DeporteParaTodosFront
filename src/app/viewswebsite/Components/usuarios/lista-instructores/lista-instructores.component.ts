import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { SidenavComponent } from '../../../pages/sidenav/sidenav.component';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
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
    FormsModule
  ],
  templateUrl: './lista-instructores.component.html',
  styleUrls: ['./lista-instructores.component.css'],
})
export class ListaInstructoresComponent implements OnInit, OnDestroy {

  instructores: InstructorDTO[] = [];
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
    this.cargarInstructores();
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  private cargarInstructores(): void {
    this.instructorservice.getInstructores().subscribe(
      (instructores: any) => {
        this.instructores = Array.isArray(instructores) ? instructores : [];
      }
    );
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
