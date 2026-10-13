import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { EstadoReporte, PlazoCargaDTO } from 'src/app/Models/DTOs/plazo-carga-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { FechaEsAdapter } from 'src/app/shared/fecha-es.adapter';
import { aDateLocal, fechaLarga, formatoLocal } from 'src/app/shared/fecha-grupo.util';
import { textoReporte } from 'src/app/shared/plazo-carga.util';
import { InstructorYaNoExiste } from '../form-instructor/form-instructor.component';

export interface DatosFormPlazoCarga {
  id: string;
  nombre: string;
  fechaActual: string | null;
  estado: EstadoReporte;
  plazoVencido: boolean;
  anio: number;
  periodo: number;
}

/** Resultado de cerrar el diálogo: el elemento actualizado, la señal de recarga, o undefined si se canceló. */
export type ResultadoFormPlazoCarga = PlazoCargaDTO | InstructorYaNoExiste;

/**
 * Asignar, cambiar o ampliar el plazo de carga de atenciones de un instructor (Coordinador).
 * Edita una copia. La fecha se escribe como dd/mm/aaaa o se elige en el calendario (botón o Alt+↓) y viaja como
 * texto yyyy-MM-dd en hora local. Que no sea pasada lo valida el backend (nunca el reloj del navegador).
 *
 * El calendario necesita MatNativeDateModule y MAT_DATE_LOCALE también en la raíz de la app (app.module): el
 * calendario emergente se crea fuera del componente y sin eso no abre ("No provider found for MAT_DATE_FORMATS").
 */
@Component({
  selector: 'app-form-plazo-carga',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: DateAdapter, useClass: FechaEsAdapter },
  ],
  templateUrl: './form-plazo-carga.component.html',
  styleUrls: ['./form-plazo-carga.component.css'],
})
export class FormPlazoCargaComponent implements OnInit, OnDestroy {
  /** Date local del calendario; el texto yyyy-MM-dd se deriva de aquí (fechaTexto). */
  fechaCtrl = new FormControl<Date | null>(aDateLocal(this.data.fechaActual), [Validators.required]);
  form = new FormGroup({ fechaLimite: this.fechaCtrl });
  /** Calendario a pantalla completa en pantallas pequeñas. */
  touchUi = false;
  guardando = false;
  errorServidor: string | null = null;
  private bpSub?: Subscription;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DatosFormPlazoCarga,
    private dialogRef: MatDialogRef<FormPlazoCargaComponent, ResultadoFormPlazoCarga>,
    private instructorService: InstructorServisce,
    private breakpointObserver: BreakpointObserver,
  ) {}

  ngOnInit(): void {
    this.bpSub = this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe(estado => { this.touchUi = estado.matches; });
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }

  /** Fija la fecha (calendario o código); null la deja vacía. */
  alElegirFecha(fecha: Date | null): void {
    this.fechaCtrl.setValue(fecha);
  }

  /** Fecha como texto yyyy-MM-dd con componentes locales (sin toISOString); '' si está vacía o es inválida. */
  get fechaTexto(): string {
    const d = this.fechaCtrl.value;
    return d && !isNaN(d.getTime()) ? formatoLocal(d) : '';
  }

  get estadoActual(): string {
    return textoReporte({ estadoReporte: this.data.estado, fechaLimite: this.data.fechaActual, plazoVencido: this.data.plazoVencido });
  }

  /** Texto para la región aria-live: la fecha elegida en lenguaje natural. */
  get textoFechaElegida(): string {
    const larga = fechaLarga(this.fechaTexto);
    return larga ? `Fecha elegida: ${larga}` : 'Aún no has elegido una fecha';
  }

  get puedeGuardar(): boolean {
    return this.fechaCtrl.valid && this.fechaTexto !== (this.data.fechaActual ?? '') && !this.guardando;
  }

  guardar(): void {
    // `guardando` se activa de forma síncrona: una segunda pulsación no envía otra petición.
    if (!this.puedeGuardar) return;
    this.guardando = true;
    this.errorServidor = null;
    this.instructorService.asignarPlazoCarga(this.data.id, this.fechaTexto).subscribe({
      next: plazo => this.dialogRef.close(plazo),
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        switch (err?.status) {
          case 422:
            this.errorServidor = err.error?.mensaje ?? 'La fecha límite no es válida';
            break;
          case 400:
            this.errorServidor = 'La fecha no es válida. Revísala e intenta de nuevo.';
            break;
          case 404:
            this.errorServidor = 'El instructor ya no existe';
            this.dialogRef.close({ yaNoExiste: true });
            break;
          default:
            this.errorServidor = 'No se pudo asignar el plazo. Intenta de nuevo.';
        }
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
