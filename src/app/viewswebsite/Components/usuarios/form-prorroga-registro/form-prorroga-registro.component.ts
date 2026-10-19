import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, Subject, catchError, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { ProrrogaDTO } from 'src/app/Models/DTOs/prorroga-registro-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { MesRegistro, mesesDisponibles, parsearValorMes, textoProrrogaVigente } from 'src/app/shared/prorroga-registro.util';

export interface InstructorElegido {
  id: string;
  nombre: string;
}

export interface DatosFormProrrogaRegistro {
  instructores: InstructorElegido[];
}

/** El instructor ya no existe (404): nada se guardó y quien abrió el diálogo debe recargar. */
export interface ProrrogaInstructorYaNoExiste {
  yaNoExiste: true;
}

/** Resultado de cerrar: la respuesta del servidor, la señal de recarga, o undefined si se canceló. */
export type ResultadoFormProrrogaRegistro = ProrrogaDTO[] | ProrrogaInstructorYaNoExiste;

/** Entero de 0 a 60 (vacío no es válido aquí: lo cubre required). */
const diasValidos = (c: AbstractControl): ValidationErrors | null => {
  const v = c.value;
  if (v === null || v === '') return null;
  return Number.isInteger(v) && v >= 0 && v <= 60 ? null : { diasFueraDeRango: true };
};

/**
 * Asignar o quitar la prórroga de registro de asistencia a uno o varios instructores (Coordinador), por mes.
 * Edita una copia. El mes elegido se envía como año y mes numéricos; la lista de meses es solo ayuda de interfaz
 * (mesesDisponibles) y el servidor es la autoridad.
 */
@Component({
  selector: 'app-form-prorroga-registro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './form-prorroga-registro.component.html',
  styleUrls: ['./form-prorroga-registro.component.css'],
})
export class FormProrrogaRegistroComponent implements OnInit, OnDestroy {
  readonly meses: MesRegistro[] = mesesDisponibles();
  readonly mesCtrl = new FormControl<string>(this.meses[0].valor, { nonNullable: true });
  readonly diasCtrl = new FormControl<number | null>(null, [Validators.required, diasValidos]);
  form = new FormGroup({ mes: this.mesCtrl, dias: this.diasCtrl });

  /** Prórrogas vigentes del mes elegido, por id de instructor. */
  vigentes = new Map<string, ProrrogaDTO>();
  cargandoVigentes = false;
  errorVigentes: string | null = null;

  guardando = false;
  errorServidor: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DatosFormProrrogaRegistro,
    private dialogRef: MatDialogRef<FormProrrogaRegistroComponent, ResultadoFormProrrogaRegistro>,
    private instructorService: InstructorServisce,
  ) {}

  ngOnInit(): void {
    // Cada cambio de mes consulta las prórrogas vigentes; switchMap descarta la respuesta de un mes anterior.
    this.mesCtrl.valueChanges.pipe(
      startWith(this.mesCtrl.value),
      tap(() => {
        this.cargandoVigentes = true;
        this.errorVigentes = null;
      }),
      switchMap(valor => {
        const mes = parsearValorMes(valor);
        if (!mes) {
          this.cargandoVigentes = false;
          return EMPTY;
        }
        return this.instructorService.getProrrogasRegistro(mes.anio, mes.mes).pipe(
          catchError((err: HttpErrorResponse) => {
            this.vigentes = new Map();
            this.cargandoVigentes = false;
            this.errorVigentes = err?.status === 422 && err.error?.mensaje
              ? err.error.mensaje
              : 'No se pudieron cargar las prórrogas vigentes de este mes.';
            return EMPTY;
          }),
        );
      }),
      takeUntil(this.destroy$),
    ).subscribe(lista => {
      this.vigentes = new Map((Array.isArray(lista) ? lista : []).map(p => [p.idInstructor, p] as [string, ProrrogaDTO]));
      this.cargandoVigentes = false;
      // Con un solo instructor se precargan sus días actuales (sin pisar lo que el usuario ya escribió).
      if (this.data.instructores.length === 1 && !this.diasCtrl.dirty) {
        const vigente = this.vigentes.get(this.data.instructores[0].id);
        this.diasCtrl.setValue(vigente ? vigente.dias : null);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  textoVigente(id: string): string {
    return textoProrrogaVigente(this.vigentes.get(id));
  }

  get puedeGuardar(): boolean {
    return this.form.valid && this.data.instructores.length > 0 && !this.guardando;
  }

  guardar(): void {
    // `guardando` se activa de forma síncrona: una segunda pulsación no envía otra petición.
    if (!this.puedeGuardar) return;
    const mes = parsearValorMes(this.mesCtrl.value);
    if (!mes) return;
    this.guardando = true;
    this.errorServidor = null;
    this.instructorService.asignarProrrogaRegistro({
      idsInstructores: this.data.instructores.map(i => i.id),
      anio: mes.anio,
      mes: mes.mes,
      dias: this.diasCtrl.value as number,
    }).subscribe({
      next: respuesta => this.dialogRef.close(respuesta),
      error: (err: HttpErrorResponse) => {
        this.guardando = false;
        switch (err?.status) {
          case 404:
            this.errorServidor = 'El instructor ya no existe';
            this.dialogRef.close({ yaNoExiste: true });
            break;
          case 422:
            this.errorServidor = err.error?.mensaje ?? 'El mes elegido no es válido.';
            break;
          case 400:
            this.errorServidor = 'Los datos no son válidos. Revisa el mes y los días (0 a 60).';
            break;
          default:
            this.errorServidor = 'No se pudo asignar la prórroga. Intenta de nuevo.';
        }
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}
