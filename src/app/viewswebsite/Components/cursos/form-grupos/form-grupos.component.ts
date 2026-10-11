import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormsModule, NgForm } from '@angular/forms';
import { GrupoService } from 'src/app/services/grupo.service';
import { GrupoDTO } from 'src/app/Models/DTOs/grupo-dto';
import { ImagenService } from 'src/app/services/imagen.service';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { InstructorDTO } from 'src/app/Models/DTOs/instructor-dto';
import { InstructorServisce } from 'src/app/services/instructor.service';

type CampoFecha = 'fechaCreacion' | 'fechaFinalizacion' | 'fechaInscripcionApertura' | 'fechaIncripcionCierre';

@Component({
  selector: 'app-form-grupos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  // dd/MM/yyyy en pantalla; el valor que viaja al backend sigue siendo texto 'yyyy-MM-dd'
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-CO' }],
  templateUrl: './form-grupos.component.html',
  styleUrls: ['./form-grupos.component.css'],
})
export class FormGruposComponent implements OnInit, OnDestroy {
  imagenSeleccionada: File | null = null;
  imagenPreview: string | null = null;
  isEditing: boolean = false;
  selectedFile: File | null = null;
  categoriaGrupo: string | null = '';
  cursoGrupo: string | null = '';
  // BUG 1 FIX: any[] porque el backend devuelve estructura plana {id, nombre, ...}
  // distinta a lo que define InstructorDTO { inst_codigo, perfil: {...} }
  instructores: any[] = [];
  errorServidor: string | null = null;
  readonly mensajeFechaNoBorrable = 'Esta fecha no se puede borrar; cámbiala por otra';
  // Valores con los que se abrió el diálogo en edición (referencia para no permitir vaciarlas)
  private fechasOriginales: Partial<Record<CampoFecha, string>> = {};
  // Modelo Date (hora local) de cada calendario; la fuente de verdad sigue siendo el texto de `grupo`
  fechasDate: Record<CampoFecha, Date | null> = {
    fechaCreacion: null, fechaFinalizacion: null, fechaInscripcionApertura: null, fechaIncripcionCierre: null,
  };
  // Calendario a pantalla completa en móviles
  touchUi = false;
  private bpSub?: Subscription;

  grupo: GrupoDTO = {
    categoria: '',
    curso: '',
    anio: null,
    iterable: null,
    imagenGrupo: null,
    idInstructor: '',
    nombreInstructor: '',
    cupos: 0,
    fechaCreacion: '',
    fechaFinalizacion: '',
    fechaInscripcionApertura: '',
    fechaIncripcionCierre: '',
  }


  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { categoria: string, curso: string, anio: number, iterable: number },
    private grupoService: GrupoService,
    private imagenService: ImagenService,
    private dialogRef: MatDialogRef<FormGruposComponent>,
    private instructorService: InstructorServisce,
    private breakpointObserver: BreakpointObserver,
  ) { }

  ngOnInit(): void {
    this.categoriaGrupo = this.data.categoria;
    this.cursoGrupo = this.data.curso;
    this.bpSub?.unsubscribe();
    this.bpSub = this.breakpointObserver.observe([Breakpoints.XSmall, Breakpoints.Small])
      .subscribe((estado) => { this.touchUi = estado.matches; });
    this.asignarFecha('fechaCreacion', this.hoyLocal());
    this.isEditing = false;
    this.fechasOriginales = {};
    if (this.data.anio != 0) {
      this.isEditing = true;
      this.loadGrupo(this.categoriaGrupo, this.cursoGrupo, this.data.anio, this.data.iterable);
    }
//obteniendo instructoress
    this.instructorService.getInstructores().subscribe(
      (response) => {
        this.instructores = response;
      }
    );
  }

  private loadGrupo(categoriaGrupo: string, cursoGrupo: string, anio: number, iterable: number): void {
    this.grupoService.getGrupo(categoriaGrupo, cursoGrupo, anio, iterable).subscribe(
      (grupotemp) => {
        this.grupo = {
          ...grupotemp,
          fechaCreacion: this.soloFecha(grupotemp.fechaCreacion),
          fechaFinalizacion: this.soloFecha(grupotemp.fechaFinalizacion),
          fechaInscripcionApertura: this.soloFecha(grupotemp.fechaInscripcionApertura),
          fechaIncripcionCierre: this.soloFecha(grupotemp.fechaIncripcionCierre),
        };
        this.sincronizarFechasDate();
        this.fechasOriginales = {
          fechaCreacion: this.grupo.fechaCreacion!,
          fechaFinalizacion: this.grupo.fechaFinalizacion!,
          fechaInscripcionApertura: this.grupo.fechaInscripcionApertura!,
          fechaIncripcionCierre: this.grupo.fechaIncripcionCierre!,
        };
        if (this.grupo.imagenGrupo != null) {
          this.imagenService.getimagen(this.grupo.imagenGrupo).subscribe(
            (imagenData) => {
              this.grupo.imagenBase64 = imagenData.datosBase64;
              this.grupo.tipoArchivo = imagenData.tipoArchivo;
              this.imagenPreview = `data:${this.grupo.tipoArchivo};base64,${this.grupo.imagenBase64}`;
            },
            (error) => {
              console.log('Error al obtener la imagen del grupo seleccionado', error);
            }
          )
        }
      },
      (error) => {
        console.error('Se produjo un error al tratar cargar el grupo seleccionado', error);
      }
    );
  }

  onSubmit(form: NgForm): void {
    if (!this.formularioValido) {
      return;
    }
    if (this.isEditing) {
      this.updateGrupo();
    } else {
      this.crearGrupo();
    }
  }

  private crearGrupo(): void {
    if (!this.selectedFile) {
      this.errorServidor = 'Selecciona una imagen para el grupo';
      return;
    }
    this.imagenService.postImagen(this.selectedFile).subscribe({
      next: (imagenResponse) => {
        const nuevoGrupo: GrupoDTO = {
          categoria: this.categoriaGrupo!,
          curso: this.cursoGrupo!,
          anio: null,
          iterable: null,
          imagenGrupo: imagenResponse.id,
          idInstructor: this.grupo.idInstructor,
          cupos: this.grupo.cupos,
          ...this.fechasParaEnviar(),
        };
        this.grupoService.createGrupo(nuevoGrupo).subscribe({
          next: () => { this.dialogRef.close(true); },
          error: (err) => { this.mostrarError(err, 'No se pudo crear el grupo'); },
        });
      },
      error: (err) => { this.mostrarError(err, 'No se pudo subir la imagen'); },
    });
  }

  private updateGrupo(): void {
    // La identidad del grupo es la ORIGINAL (la recibida al abrir el diálogo), nunca la del formulario.
    const { categoria, curso, anio, iterable } = this.data;
    const payload: GrupoDTO = {
      categoria,
      curso,
      anio,
      iterable,
      idInstructor: this.grupo.idInstructor ?? null,
      cupos: this.grupo.cupos,
      ...this.fechasParaEnviar(),
    };

    const enviar = (dto: GrupoDTO): void => {
      this.grupoService.updateGrupo(categoria, curso, anio, iterable, dto).subscribe({
        next: () => { this.dialogRef.close(true); },
        error: (err) => { this.mostrarError(err, 'No se pudo actualizar el grupo'); },
      });
    };

    if (this.selectedFile) {
      this.imagenService.postImagen(this.selectedFile).subscribe({
        next: (imagenResponse) => { enviar({ ...payload, imagenGrupo: imagenResponse.id }); },
        error: (err) => { this.mostrarError(err, 'No se pudo subir la imagen'); },
      });
    } else {
      enviar(payload);
    }
  }

  private mostrarError(err: any, respaldo: string): void {
    this.errorServidor = err?.error?.mensaje ?? respaldo;
  }

  /** Fechas como texto 'yyyy-MM-dd'; vacío → null. Sin Date ni toISOString (desfasan un día por zona horaria). */
  private fechasParaEnviar(): Pick<GrupoDTO, 'fechaCreacion' | 'fechaFinalizacion' | 'fechaInscripcionApertura' | 'fechaIncripcionCierre'> {
    return {
      fechaCreacion: this.grupo.fechaCreacion || null,
      fechaFinalizacion: this.grupo.fechaFinalizacion || null,
      fechaInscripcionApertura: this.grupo.fechaInscripcionApertura || null,
      fechaIncripcionCierre: this.grupo.fechaIncripcionCierre || null,
    };
  }

  ngOnDestroy(): void {
    this.bpSub?.unsubscribe();
  }

  /** Cambio desde el calendario: guarda el texto 'yyyy-MM-dd' con componentes LOCALES (sin toISOString). */
  alElegirFecha(campo: CampoFecha, fecha: Date | null): void {
    this.fechasDate[campo] = fecha;
    this.grupo[campo] = fecha ? this.formatoLocal(fecha) : '';
  }

  limpiarFecha(campo: CampoFecha): void {
    this.alElegirFecha(campo, null);
  }

  /** Solo se puede limpiar lo opcional; en edición una fecha con valor original no se puede borrar. */
  puedeLimpiar(campo: CampoFecha): boolean {
    return !!this.grupo[campo] && !(this.isEditing && !!this.fechasOriginales[campo]);
  }

  private asignarFecha(campo: CampoFecha, valor: string): void {
    this.grupo[campo] = valor;
    this.fechasDate[campo] = this.aDateLocal(valor);
  }

  private sincronizarFechasDate(): void {
    (['fechaCreacion', 'fechaFinalizacion', 'fechaInscripcionApertura', 'fechaIncripcionCierre'] as CampoFecha[])
      .forEach(c => { this.fechasDate[c] = this.aDateLocal(this.grupo[c]); });
  }

  /** 'yyyy-MM-dd' → Date a medianoche LOCAL (new Date('yyyy-MM-dd') sería UTC y desfasaría un día). */
  private aDateLocal(valor: string | null | undefined): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  private formatoLocal(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private soloFecha(valor: string | null | undefined): string {
    return valor ? valor.substring(0, 10) : '';
  }

  private hoyLocal(): string {
    return this.formatoLocal(new Date());
  }

  /** Una regla solo aplica si ambas fechas tienen valor. 'yyyy-MM-dd' se compara bien como texto. */
  private anterior(fecha?: string | null, referencia?: string | null): boolean {
    return !!fecha && !!referencia && fecha < referencia;
  }

  get errorFinalizacion(): string | null {
    return this.anterior(this.grupo.fechaFinalizacion, this.grupo.fechaCreacion)
      ? 'La fecha de finalización del grupo no puede ser anterior a la fecha de inicio del grupo' : null;
  }

  get errorCierreInscripcion(): string | null {
    return this.anterior(this.grupo.fechaIncripcionCierre, this.grupo.fechaInscripcionApertura)
      ? 'El cierre de inscripciones no puede ser anterior a la apertura de inscripciones' : null;
  }

  /**
   * En edición, una fecha que tenía valor al abrir no puede quedar vacía: el backend interpreta
   * null como "conservar el valor actual" y el borrado se descartaría en silencio.
   * TODO: levantar esta restricción cuando el backend permita quitar una fecha de forma explícita.
   */
  fechaVaciada(campo: CampoFecha): boolean {
    return this.isEditing && !!this.fechasOriginales[campo] && !this.grupo[campo];
  }

  get errorCupos(): string | null {
    const c = this.grupo.cupos;
    return typeof c === 'number' && Number.isInteger(c) && c >= 1
      ? null : 'Los cupos deben ser un número entero mayor o igual a 1';
  }

  get formularioValido(): boolean {
    return this.fechasValidas && !this.errorCupos;
  }

  get fechasValidas(): boolean {
    const campos: CampoFecha[] = ['fechaCreacion', 'fechaFinalizacion', 'fechaInscripcionApertura', 'fechaIncripcionCierre'];
    return !this.errorFinalizacion && !this.errorCierreInscripcion && !campos.some(c => this.fechaVaciada(c));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      this.imagenSeleccionada = input.files[0];
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(this.imagenSeleccionada);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
