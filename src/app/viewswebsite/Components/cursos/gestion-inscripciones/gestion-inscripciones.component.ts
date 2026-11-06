import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule,   } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {MatExpansionModule} from '@angular/material/expansion';

@Component({
  selector: 'app-gestion-inscripciones',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatInputModule,
    FormsModule,
    MatExpansionModule,
    
  ],

  providers: [
    MatDatepickerModule,
    MatNativeDateModule, 
  ],
  templateUrl: './gestion-inscripciones.component.html',
  styleUrls: ['./gestion-inscripciones.component.css'],
})
export class GestionInscripcionesComponent {

  constructor(
    private dailogref: MatDialogRef<GestionInscripcionesComponent>
  ){

  }
  modalidades = [
    { nombre: 'Seleccionados', seleccionado: true },
    { nombre: 'Semilleros', seleccionado: false },
    { nombre: 'Formativos', seleccionado: false },
  ];

  // Fechas
  fechaInicio: Date | null = null;
  fechaFin: Date | null = null;

  guardar() {
    console.log('Modalidades:', this.modalidades);
    console.log('Fecha Inicio:', this.fechaInicio);
    console.log('Fecha Fin:', this.fechaFin);
    this.dailogref.close()
    // Aquí podrías enviar los datos al backend
  }

  cancelar() {
    this.dailogref.close();
  }
}
