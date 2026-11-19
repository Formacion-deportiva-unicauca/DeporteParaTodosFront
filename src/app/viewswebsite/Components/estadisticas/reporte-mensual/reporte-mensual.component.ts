import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Color, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { Subscription } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { EsqueletoComponent } from 'src/app/shared/esqueleto/esqueleto.component';
import { PerfilService } from 'src/app/services/perfil.service';
import { ReporteMensualService } from 'src/app/services/reporte-mensual.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { FiltrosReporte, OpcionesReporteDTO, ReporteMensualDTO } from 'src/app/Models/DTOs/reporte-mensual-dto';
import {
  AVISO_FACULTAD, EstadoVistaReporte, Medida, VINCULOS, datosBarrasPorCurso, datosBarrasPorVinculo, datosDonaGenero,
  estadoDelReporte, fechaDeGeneracion, filtrosEnTexto, filtrosVacios, formatoNumero, formatoPorcentaje, hayFiltros,
  mesInicial, mesesDisponibles, nombrePublico, resumenGrafica,
} from 'src/app/shared/reporte-mensual.util';
import { contenidoExportable } from 'src/app/shared/reporte-mensual-exportar.util';

/**
 * Reporte mensual (solo Coordinador). El backend decide: si responde 403 se muestra "sin permiso". Los filtros se aplican con el
 * botón "Aplicar"; mientras tanto la pantalla conserva el reporte anterior. Cada gráfica tiene su tabla equivalente.
 */
@Component({
  selector: 'app-reporte-mensual',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule, NgxChartsModule, SidenavComponent, EsqueletoComponent],
  templateUrl: './reporte-mensual.component.html',
  styleUrls: ['./reporte-mensual.component.css'],
})
export class ReporteMensualComponent implements OnInit, OnDestroy {
  readonly vinculos = VINCULOS;
  readonly avisoFacultad = AVISO_FACULTAD;
  /** Hombres azul y mujeres naranja; además cada barra lleva su valor y hay una tabla equivalente: el color nunca es lo único. */
  readonly esquemaGenero: Color = { name: 'genero', selectable: true, group: ScaleType.Ordinal, domain: ['#1d72d3', '#ff6c08'] };
  readonly esquemaVinculo: Color = { name: 'vinculo', selectable: true, group: ScaleType.Ordinal, domain: ['#000066', '#1d72d3', '#5bae40', '#5a00ba'] };

  estado: EstadoVistaReporte = 'cargando';
  perfil = '';
  opciones: OpcionesReporteDTO | null = null;
  meses: { valor: string; etiqueta: string }[] = [];
  reporte: ReporteMensualDTO | null = null;
  /** Los filtros con los que se pidió el reporte que se ve (el formulario puede ir por delante). */
  aplicados: FiltrosReporte = filtrosVacios('');
  medida: Medida = 'atenciones';
  verTabla = false;
  exportando = false;

  datosCurso: { name: string; series: { name: string; value: number }[] }[] = [];
  datosGenero: { name: string; value: number }[] = [];
  datosVinculo: { name: string; value: number }[] = [];
  alturaGraficaCursos = 280;

  readonly formulario: FormGroup;
  private suscripcion?: Subscription;
  private iniciado = false;

  constructor(
    fb: FormBuilder,
    private servicio: ReporteMensualService,
    private perfilService: PerfilService,
    private notificaciones: NotificacionService,
    private router: Router,
  ) {
    this.formulario = fb.group({
      mes: [''], disciplina: [''], modalidad: [''], publico: [''], vinculos: [[] as string[]],
      agruparFuncionarios: [false], genero: [''], facultad: [''],
    });
  }

  ngOnInit(): void {
    // Se espera a conocer el perfil: solo el Coordinador pide el reporte (a los demás roles el backend les respondería 403).
    this.suscripcion = this.perfilService.perfil$.subscribe(perfil => {
      this.perfil = perfil;
      if (perfil === 'Coordinador' && !this.iniciado) {
        this.iniciado = true;
        this.cargarOpciones();
      } else if (perfil && perfil !== 'Coordinador') {
        this.estado = 'sinPermiso';
      }
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  get esCoordinador(): boolean {
    return this.perfil === 'Coordinador';
  }

  get hayFiltrosAplicados(): boolean {
    return hayFiltros(this.aplicados);
  }

  get filtrosAplicadosTexto(): { nombre: string; valor: string }[] {
    return filtrosEnTexto(this.aplicados);
  }

  get facultadSeleccionada(): boolean {
    return !!this.formulario.value.facultad;
  }

  cargarOpciones(): void {
    this.estado = 'cargando';
    this.servicio.getOpciones().subscribe({
      next: opciones => {
        this.opciones = opciones;
        this.meses = mesesDisponibles(opciones.primerMes);
        this.formulario.patchValue({ mes: mesInicial(opciones.primerMes) });
        this.aplicar();
      },
      error: err => this.fallo(err),
    });
  }

  aplicar(): void {
    const f = this.filtrosDelFormulario();
    if (!f.mes) return;
    this.aplicados = f;
    this.estado = 'cargando';
    this.servicio.getMensual(f).subscribe({
      next: reporte => {
        this.reporte = reporte;
        this.estado = estadoDelReporte(reporte, f);
        this.actualizarGraficas();
      },
      error: err => this.fallo(err),
    });
  }

  limpiar(): void {
    const mes = this.formulario.value.mes;
    this.formulario.reset({ ...filtrosVacios(mes), vinculos: [] });
    this.aplicar();
  }

  reintentar(): void {
    if (this.opciones) {
      this.aplicar();
    } else {
      this.cargarOpciones();
    }
  }

  alternarVinculo(vinculo: string, marcado: boolean): void {
    const actuales: string[] = this.formulario.value.vinculos ?? [];
    const nuevos = marcado ? [...actuales.filter(v => v !== vinculo), vinculo] : actuales.filter(v => v !== vinculo);
    this.formulario.patchValue({ vinculos: this.vinculos.filter(v => nuevos.includes(v)) });
  }

  vinculoMarcado(vinculo: string): boolean {
    return (this.formulario.value.vinculos ?? []).includes(vinculo);
  }

  cambiarMedida(medida: Medida): void {
    this.medida = medida;
    this.actualizarGraficas();
  }

  alternarTabla(): void {
    this.verTabla = !this.verTabla;
  }

  irAInicio(evento: Event): void {
    evento.preventDefault();
    void this.router.navigate(['/home']);
  }

  // ── Presentación ──

  readonly numero = formatoNumero;
  readonly nombrePublico = nombrePublico;
  readonly resumen = resumenGrafica;

  porcentaje(parte: number, total: number): string {
    return formatoPorcentaje(parte, total);
  }

  get textoMedida(): string {
    return this.medida === 'atenciones' ? 'atenciones' : 'inscritos';
  }

  get hayCalidad(): boolean {
    const c = this.reporte?.calidad;
    return !!c && (c.clasesSinConfirmar > 0 || c.atencionesSinInscripcion > 0);
  }

  /** Exporta el PDF con lo que se ve (mismos filtros y cifras), con los filtros aplicados y la fecha de generación en el encabezado. */
  async exportarPDF(): Promise<void> {
    if (!this.reporte || this.estado !== 'listo' || this.exportando) return;
    this.exportando = true;
    try {
      const contenido = contenidoExportable(this.reporte, this.aplicados, fechaDeGeneracion());
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text(contenido.titulo, 14, 16);
      doc.setFontSize(9);
      let y = 23;
      [`Generado el ${contenido.generado}`, ...contenido.filtros].forEach(linea => { doc.text(linea, 14, y); y += 5; });
      autoTable(doc, { startY: y + 2, head: [contenido.cabecera], body: contenido.filas, foot: [contenido.pie], showFoot: 'lastPage',
        styles: { fontSize: 8 }, headStyles: { fillColor: [0, 0, 102] }, footStyles: { fillColor: [236, 240, 255], textColor: [0, 0, 102] } });
      const despues = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      autoTable(doc, { startY: despues, head: [['Vínculo', 'Inscritos', 'Atenciones']], body: contenido.vinculos, styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 102] } });
      const despues2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
      doc.setFontSize(8);
      contenido.notas.forEach((nota, i) => doc.text(nota, 14, despues2 + i * 4));
      doc.save(`reporte-mensual-${this.aplicados.mes}.pdf`);
    } catch {
      this.notificaciones.error('No se pudo exportar el PDF', 'Intente de nuevo.');
    } finally {
      this.exportando = false;
    }
  }

  // ── Internos ──

  private filtrosDelFormulario(): FiltrosReporte {
    const v = this.formulario.value;
    return {
      mes: v.mes ?? '', disciplina: v.disciplina ?? '', modalidad: v.modalidad ?? '', publico: v.publico ?? '',
      vinculos: [...(v.vinculos ?? [])], agruparFuncionarios: !!v.agruparFuncionarios, genero: v.genero ?? '', facultad: v.facultad ?? '',
    };
  }

  /** Los datos de las gráficas se calculan una vez por reporte o medida: ngx-charts vuelve a dibujar si recibe un arreglo nuevo. */
  private actualizarGraficas(): void {
    if (!this.reporte) return;
    this.datosCurso = datosBarrasPorCurso(this.reporte, this.medida);
    this.datosGenero = datosDonaGenero(this.reporte, this.medida);
    this.datosVinculo = datosBarrasPorVinculo(this.reporte, this.medida);
    this.alturaGraficaCursos = Math.max(280, this.datosCurso.length * 72 + 110);
  }

  private fallo(err: { status?: number }): void {
    this.estado = err?.status === 403 ? 'sinPermiso' : 'error';
  }
}
