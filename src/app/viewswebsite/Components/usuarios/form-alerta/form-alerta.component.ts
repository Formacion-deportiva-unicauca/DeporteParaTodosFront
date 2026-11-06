import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, NgForm } from '@angular/forms';
import { AlertaDTO } from 'src/app/Models/DTOs/alerta-dto';
import { AlertaServiceService } from 'src/app/services/alerta-service.service';

@Component({
  selector: 'app-form-alerta',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    FormsModule,
    MatButtonModule,
    MatInputModule,
  ],
  templateUrl: './form-alerta.component.html',
  styleUrls: ['./form-alerta.component.css']
})
export class FormAlertaComponent {
  notificacion: AlertaDTO = {
    asunto: "",
    descripcion: "",
  }
  constructor(
    private alertaservice: AlertaServiceService,
    private dialogRef: MatDialogRef<FormAlertaComponent>
  ) {

  }

  onSubmit(form: NgForm): void {
    if (form.valid) {
      this.notificacion.asunto = form.value.titulo;
      this.notificacion.descripcion = form.value.descripcion;
      this.alertaservice.guardarAlerta(this.notificacion);
      this.dialogRef.close();

    }

  }


  onCancel(): void {
    this.dialogRef.close();
  }
}
