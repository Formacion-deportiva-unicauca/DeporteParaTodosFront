import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DialogRef } from '@angular/cdk/dialog';
import { AlertaServiceService } from 'src/app/services/alerta-service.service';
import { AlertaDTO } from 'src/app/Models/DTOs/alerta-dto';

@Component({
  selector: 'app-ver-notificaciones',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  templateUrl: './ver-notificaciones.component.html',
  styleUrls: ['./ver-notificaciones.component.css'],
})
export class VerNotificacionesComponent implements OnInit{

  alertas: AlertaDTO[]=[];
  

  constructor(
    private dialogRef: DialogRef<VerNotificacionesComponent>, 
    private alertService: AlertaServiceService,
  ) {}

  ngOnInit(): void {
    this.alertas = this.alertService.retornarAlerta();
    
  }

  onClose(): void {
    this.dialogRef.close();
  }


}
