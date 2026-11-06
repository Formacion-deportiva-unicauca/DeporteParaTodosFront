import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { formatoHora12 } from 'src/app/shared/ventana-registro.util';
import { HorarioDTO } from 'src/app/Models/DTOs/horario-dto';
import { EscenarioDTO } from 'src/app/Models/DTOs/escenario-dto';
import { HorarioService } from 'src/app/services/horario.service';
import { EscenarioService } from 'src/app/services/escenario.service';

/** Nombre completo de cada día, para los lectores de pantalla (el chip solo muestra "Lun", "Mar"...). */
const NOMBRE_DIA: Record<string, string> = {
  LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves',
  VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo',
};

@Component({
  selector: 'app-form-horario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
  ],
  templateUrl: './form-horario.component.html',
  styleUrls: ['./form-horario.component.css'],
})
export class FormHorarioComponent implements OnInit {

  horarios: HorarioDTO[] = [];
  escenarios: EscenarioDTO[] = [];
  confirmandoEliminacionId: number | null = null;
  cambiosRealizados = false;
  /** true si no se pudieron traer los horarios registrados: se avisa en lugar de mostrar "Sin horarios". */
  errorCargaHorarios = false;

  dias = [
    { label: 'Lun', valor: 'LUNES',     seleccionado: false },
    { label: 'Mar', valor: 'MARTES',    seleccionado: false },
    { label: 'Mié', valor: 'MIERCOLES', seleccionado: false },
    { label: 'Jue', valor: 'JUEVES',    seleccionado: false },
    { label: 'Vie', valor: 'VIERNES',   seleccionado: false },
    { label: 'Sáb', valor: 'SABADO',    seleccionado: false },
    { label: 'Dom', valor: 'DOMINGO',   seleccionado: false },
  ];

  horaInicio = '';
  horaFin = '';
  escenarioSeleccionado = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { categoria: string; curso: string; anio: number; iterable: number; nuevoGrupo?: boolean },
    private dialogRef: MatDialogRef<FormHorarioComponent>,
    private horarioService: HorarioService,
    private escenarioService: EscenarioService,
    private notificaciones: NotificacionService,
  ) {}

  ngOnInit(): void {
    this.cargarHorarios();
    this.escenarioService.getEscenarios().subscribe({
      next: (data: any) => { this.escenarios = Array.isArray(data) ? data.filter((e: EscenarioDTO) => e.disponible) : []; },
      error: () => {
        this.notificaciones.error('No se pudieron cargar los escenarios', 'Cierre el diálogo y vuelva a abrirlo.');
      },
    });
  }

  private cargarHorarios(): void {
    this.horarioService
      .getHorarios(this.data.categoria, this.data.curso, this.data.anio, this.data.iterable)
      .subscribe({
        next: (data: any) => {
          this.horarios = Array.isArray(data) ? data : [];
          this.errorCargaHorarios = false;
        },
        error: () => { this.errorCargaHorarios = true; },
      });
  }

  /** Diálogo abierto justo después de crear el grupo: "Paso 2 de 2" y se puede omitir. */
  get esNuevoGrupo(): boolean {
    return !!this.data?.nuevoGrupo;
  }

  get etiquetaCerrar(): string {
    if (!this.esNuevoGrupo) return 'Cerrar';
    return this.cambiosRealizados ? 'Listo' : 'Omitir por ahora';
  }

  /** Aviso del paso 2: el grupo sigue sin horario (no se avisa mientras no se sepa si los horarios cargaron). */
  get mostrarAvisoSinHorario(): boolean {
    return this.esNuevoGrupo && !this.errorCargaHorarios && this.horarios.length === 0;
  }

  horaCorta(hora: string): string {
    return formatoHora12(hora);
  }

  nombreDia(valor: string): string {
    return NOMBRE_DIA[valor] ?? valor;
  }

  /** Aviso cuando la hora de fin no es posterior a la de inicio (las horas "HH:mm" se comparan como texto). */
  get errorHoras(): string {
    return this.horaInicio && this.horaFin && this.horaFin <= this.horaInicio
      ? 'La hora de fin debe ser posterior a la de inicio.'
      : '';
  }

  puedeGuardar(): boolean {
    return (
      this.dias.some(d => d.seleccionado) &&
      !!this.horaInicio &&
      !!this.horaFin &&
      this.horaFin > this.horaInicio &&
      !!this.escenarioSeleccionado
    );
  }

  guardar(): void {
    const peticiones = this.dias
      .filter(d => d.seleccionado)
      .map(d =>
        this.horarioService.crearHorario({
          id: 0,
          categoria: this.data.categoria,
          curso: this.data.curso,
          anio: this.data.anio,
          iterable: this.data.iterable,
          dia: d.valor,
          horaInicio: this.horaInicio,
          horaFin: this.horaFin,
          escenario: this.escenarioSeleccionado,
          eliminado: 0,
        })
      );

    const cantidad = peticiones.length;
    forkJoin(peticiones).subscribe({
      next: () => {
        this.cambiosRealizados = true;
        this.dias.forEach(d => (d.seleccionado = false));
        this.horaInicio = '';
        this.horaFin = '';
        this.escenarioSeleccionado = '';
        this.cargarHorarios();
        this.notificaciones.exito(cantidad === 1 ? 'Horario agregado' : 'Horarios agregados',
          `Se registró ${cantidad} ${cantidad === 1 ? 'horario' : 'horarios'} en el grupo.`);
      },
      error: () => {
        this.notificaciones.error('No se pudo agregar el horario', 'Error al agregar horario(s). Intente de nuevo.');
      },
    });
  }

  confirmarEliminacion(id: number): void {
    this.confirmandoEliminacionId = id;
  }

  cancelarEliminacion(): void {
    this.confirmandoEliminacionId = null;
  }

  eliminarHorario(id: number): void {
    this.horarioService.eliminarHorario(id).subscribe({
      next: () => {
        this.horarios = this.horarios.filter(h => h.id !== id);
        this.confirmandoEliminacionId = null;
        this.cambiosRealizados = true;
        this.notificaciones.exito('Horario eliminado', 'Ya no aparece en el grupo.');
      },
      error: () => {
        this.confirmandoEliminacionId = null;
        this.notificaciones.error('No se pudo eliminar el horario', 'Error al eliminar el horario. Intente de nuevo.');
      },
    });
  }

  onCerrar(): void {
    this.dialogRef.close(this.cambiosRealizados);
  }
}
