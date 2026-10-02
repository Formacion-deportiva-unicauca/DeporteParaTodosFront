import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogModule,
} from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoriaService } from 'src/app/services/categoria.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { AsistenciaService } from 'src/app/services/asistencia.service';
import { GrupoService } from 'src/app/services/grupo.service';
import { InstructorServisce } from 'src/app/services/instructor.service';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    CommonModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
  ],
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css'],
})
export class DialogComponent {
  constructor(
    private categoriaservice: CategoriaService,
    private cursoService: CursodeportivoService,
    private inscripcionService: InscripcionesService,
    private asistenciaService: AsistenciaService,
    private grupoService: GrupoService,
    private instructorService: InstructorServisce,
    private dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      elemento: string,
      nombreElemento: any,
      tipoElemento: string,
      categoria?: string,
      curso?: string,
      alumnoId?: number,
      anio?: number,
      iterable?: number,
      prmPerfId?: string,
      prmClsCodigo?: number,
      instructorId?: string,
    }
  ) { }

  confirmarEliminar(): void {
    if (this.data.tipoElemento == 'categoria') {
      this.categoriaservice.deleteCategoria(this.data.nombreElemento).subscribe({
        next: () => this.dialogRef.close({ confirmado: true, id: this.data.nombreElemento }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }

    if (this.data.tipoElemento == 'curso') {
      this.cursoService.deleteCurso(this.data.categoria!, this.data.nombreElemento).subscribe({
        next: () => this.dialogRef.close({ confirmado: true, id: this.data.nombreElemento }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }

    if (this.data.tipoElemento == 'inscripcion') {
      this.inscripcionService.eliminarInscripcion({
        alumnoId: this.data.alumnoId!,
        categoria: this.data.categoria!,
        curso: this.data.nombreElemento,
        anio: this.data.anio!,
        iterable: this.data.iterable!,
      } as any).subscribe({
        next: () => this.dialogRef.close({ confirmado: true }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }

    if (this.data.tipoElemento == 'asistencia') {
      this.asistenciaService.eliminarAsistencia(this.data.prmPerfId!, this.data.prmClsCodigo!).subscribe({
        next: () => this.dialogRef.close({ confirmado: true }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }

    if (this.data.tipoElemento == 'grupo') {
      this.grupoService.deleteGrupo(this.data.categoria!, this.data.curso!, this.data.anio!, this.data.iterable!).subscribe({
        next: () => this.dialogRef.close({ confirmado: true }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }

    if (this.data.tipoElemento == 'instructor') {
      this.instructorService.deleteInstructor(this.data.instructorId!).subscribe({
        next: () => this.dialogRef.close({ confirmado: true }),
        error: (err) => this.dialogRef.close({ confirmado: false, errorStatus: err?.status }),
      });
    }
  }
}
