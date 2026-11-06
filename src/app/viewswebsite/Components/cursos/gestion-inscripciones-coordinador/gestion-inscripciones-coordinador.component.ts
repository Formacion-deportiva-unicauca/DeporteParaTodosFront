import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, distinctUntilChanged } from 'rxjs';
import { SidenavComponent } from '../../../pages/sidenav/sidenav.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { NivelOcupacion, OcupacionGrupoDTO, PublicoCurso } from 'src/app/Models/DTOs/ocupacion-grupo-dto';
import { formatearFecha, formatoLocal } from 'src/app/shared/fecha-grupo.util';

const PUBLICOS: PublicoCurso[] = ['ESTUDIANTE', 'FUNCIONARIO', 'MIXTO'];
const NIVELES: NivelOcupacion[] = ['LLENO', 'POR_LLENAR', 'CON_CUPO'];

/**
 * Fase 4: módulo del Coordinador para abrir inscripciones de todo un periodo a la vez.
 * Tablero de ocupación por grupo + selección + periodo (apertura opcional, cierre obligatorio) con vista previa.
 */
@Component({
  selector: 'app-gestion-inscripciones-coordinador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatButtonModule, MatSnackBarModule, SidenavComponent],
  templateUrl: './gestion-inscripciones-coordinador.component.html',
  styleUrls: ['./gestion-inscripciones-coordinador.component.css'],
})
export class GestionInscripcionesCoordinadorComponent implements OnInit, OnDestroy {

  perfil = '';
  grupos: OcupacionGrupoDTO[] = [];
  cargando = false;
  errorCarga = false;
  aplicando = false;

  filtros: { categoria: string; curso: string; publico: '' | PublicoCurso; nivel: '' | NivelOcupacion } =
    { categoria: '', curso: '', publico: '', nivel: '' };

  fechaApertura = '';
  fechaCierre = '';
  /** El error del cierre se muestra solo cuando la persona ya pasó por el campo (no al abrir la pantalla). */
  cierreTocado = false;

  readonly formatearFecha = formatearFecha;

  // Se guarda por clave, así la selección sobrevive a los filtros.
  private claves = new Set<string>();
  private perfilSub: Subscription = Subscription.EMPTY;

  constructor(
    private grupoService: GrupoService,
    private perfilService: PerfilService,
    private notificaciones: NotificacionService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.leerFiltrosDeLaUrl();
    this.perfilSub = this.perfilService.perfil$.pipe(distinctUntilChanged()).subscribe(p => {
      this.perfil = p;
      if (p === 'Coordinador') {
        this.cargar();
      }
    });
  }

  ngOnDestroy(): void {
    this.perfilSub.unsubscribe();
  }

  get esCoordinador(): boolean {
    return this.perfil === 'Coordinador';
  }

  cargar(): void {
    this.cargando = true;
    this.errorCarga = false;
    this.grupoService.getOcupacion().subscribe({
      next: datos => {
        this.grupos = datos;
        // Descarta selecciones de grupos que ya no existen.
        const vigentes = new Set(datos.map(g => this.clave(g)));
        this.claves = new Set([...this.claves].filter(c => vigentes.has(c)));
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = true;
        this.cargando = false;
      },
    });
  }

  // ── Filtros ──

  get categorias(): string[] {
    return this.unicos(this.grupos.map(g => g.categoria));
  }

  get cursos(): string[] {
    const base = this.filtros.categoria ? this.grupos.filter(g => g.categoria === this.filtros.categoria) : this.grupos;
    return this.unicos(base.map(g => g.curso));
  }

  get filtrados(): OcupacionGrupoDTO[] {
    const f = this.filtros;
    return this.grupos.filter(g =>
      (!f.categoria || g.categoria === f.categoria)
      && (!f.curso || g.curso === f.curso)
      && (!f.publico || g.publico === f.publico)
      && (!f.nivel || g.nivel === f.nivel));
  }

  alCambiarCategoria(categoria: string): void {
    this.filtros.categoria = categoria;
    if (this.filtros.curso && !this.cursos.includes(this.filtros.curso)) {
      this.filtros.curso = '';
    }
    this.alCambiarFiltro();
  }

  /**
   * Guarda los filtros en la URL (sin añadir entradas al historial): así, al volver con "atrás" desde un curso o una
   * planilla, la tabla reaparece con los mismos filtros.
   */
  alCambiarFiltro(): void {
    const f = this.filtros;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        categoria: f.categoria || null,
        curso: f.curso || null,
        publico: f.publico || null,
        nivel: f.nivel || null,
      },
      replaceUrl: true,
    });
  }

  private leerFiltrosDeLaUrl(): void {
    const q = this.route.snapshot.queryParamMap;
    const publico = q.get('publico');
    const nivel = q.get('nivel');
    this.filtros = {
      categoria: q.get('categoria') ?? '',
      curso: q.get('curso') ?? '',
      publico: PUBLICOS.includes(publico as PublicoCurso) ? (publico as PublicoCurso) : '',
      nivel: NIVELES.includes(nivel as NivelOcupacion) ? (nivel as NivelOcupacion) : '',
    };
  }

  // ── Resumen ──

  get totalAbiertas(): number {
    return this.grupos.filter(g => g.estadoInscripcion === 'ABIERTAS' && !g.cerradaManual).length;
  }

  get totalLlenos(): number {
    return this.grupos.filter(g => g.nivel === 'LLENO').length;
  }

  get hayFiltros(): boolean {
    const f = this.filtros;
    return !!(f.categoria || f.curso || f.publico || f.nivel);
  }

  limpiarFiltros(): void {
    this.filtros = { categoria: '', curso: '', publico: '', nivel: '' };
    this.alCambiarFiltro();
  }

  irAInicio(evento: Event): void {
    evento.preventDefault();
    void this.router.navigate(['/home']);
  }

  // ── Presentación ──

  porcentaje(g: OcupacionGrupoDTO): number {
    if (!g.cupos) return 0;
    return Math.min(100, Math.round((g.inscritos * 100) / g.cupos));
  }

  textoNivel(nivel: NivelOcupacion): string {
    if (nivel === 'LLENO') return 'Lleno';
    if (nivel === 'POR_LLENAR') return 'Por llenar';
    return 'Con cupo';
  }

  /** Clase del chip de ocupación. El color nunca es rojo (rol de error naranja del lineamiento) y siempre va con texto. */
  claseNivel(nivel: NivelOcupacion): string {
    if (nivel === 'LLENO') return 'nivel-lleno';
    if (nivel === 'POR_LLENAR') return 'nivel-por-llenar';
    return 'nivel-con-cupo';
  }

  textoVentana(g: OcupacionGrupoDTO): string {
    if (g.cerradaManual) return 'Cerradas por el Coordinador';
    if (g.estadoInscripcion === 'ABIERTAS') return 'Abiertas';
    if (g.estadoInscripcion === 'NO_ABIERTAS') return 'Aún no abren';
    return 'Cerradas';
  }

  textoPublico(p: PublicoCurso): string {
    if (p === 'ESTUDIANTE') return 'Estudiantes';
    if (p === 'FUNCIONARIO') return 'Funcionarios';
    return 'Mixto';
  }

  // ── Selección ──

  clave(g: { categoria: string; curso: string; anio: number; iterable: number }): string {
    return `${g.categoria}|${g.curso}|${g.anio}|${g.iterable}`;
  }

  estaSeleccionado(g: OcupacionGrupoDTO): boolean {
    return this.claves.has(this.clave(g));
  }

  alternarSeleccion(g: OcupacionGrupoDTO): void {
    const k = this.clave(g);
    if (this.claves.has(k)) this.claves.delete(k); else this.claves.add(k);
  }

  get seleccionados(): OcupacionGrupoDTO[] {
    return this.grupos.filter(g => this.claves.has(this.clave(g)));
  }

  get todosSeleccionados(): boolean {
    const visibles = this.filtrados;
    return visibles.length > 0 && visibles.every(g => this.estaSeleccionado(g));
  }

  alternarTodos(): void {
    const marcar = !this.todosSeleccionados;
    for (const g of this.filtrados) {
      if (marcar) this.claves.add(this.clave(g)); else this.claves.delete(this.clave(g));
    }
  }

  limpiarSeleccion(): void {
    this.claves = new Set();
  }

  /** Texto de la barra de selección (región aria-live). */
  get textoSeleccion(): string {
    const n = this.seleccionados.length;
    if (n === 0) return 'Seleccione grupos para modificar su periodo';
    return `${n} ${n === 1 ? 'grupo seleccionado' : 'grupos seleccionados'}`;
  }

  /** Lleva a quien eligió grupos hasta las fechas y deja el cursor en el campo de cierre. */
  irAlPeriodo(): void {
    const panel = document.getElementById('panel-periodo');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('fecha-cierre')?.focus({ preventScroll: true });
  }

  /** Atajo de una fila: deja seleccionado solo ese grupo para extenderle el cierre. */
  extender(g: OcupacionGrupoDTO): void {
    this.claves = new Set([this.clave(g)]);
  }

  // ── Periodo ──

  get errorPeriodo(): string | null {
    if (!this.fechaCierre) return 'El cierre de inscripciones es obligatorio';
    if (this.fechaApertura && this.fechaCierre < this.fechaApertura) {
      return 'El cierre no puede ser anterior a la apertura';
    }
    if (this.fechaCierre < formatoLocal(new Date())) {
      return 'La fecha de cierre ya pasó: elige hoy o una fecha posterior';
    }
    return null;
  }

  get mostrarErrorPeriodo(): boolean {
    return this.errorPeriodo !== null && this.cierreTocado;
  }

  /** Por qué el botón de aplicar está deshabilitado (para que no quede un botón gris sin explicación). */
  get motivoBloqueo(): string | null {
    if (this.aplicando || this.puedeAplicar) return null;
    if (this.seleccionados.length === 0) return 'Seleccione al menos un grupo en la tabla para poder aplicar el periodo.';
    if (!this.fechaCierre) return 'Defina la fecha de cierre para poder aplicar el periodo.';
    return this.errorPeriodo;
  }

  get puedeAplicar(): boolean {
    return !this.aplicando && this.errorPeriodo === null && this.seleccionados.length > 0;
  }

  aplicar(): void {
    if (!this.puedeAplicar) return;
    const elegidos = this.seleccionados;
    this.aplicando = true;
    this.grupoService.aplicarPeriodo({
      fechaApertura: this.fechaApertura || null,
      fechaCierre: this.fechaCierre,
      grupos: elegidos.map(g => ({ categoria: g.categoria, curso: g.curso, anio: g.anio, iterable: g.iterable })),
    }).subscribe({
      next: () => {
        this.aplicando = false;
        const n = elegidos.length;
        this.notificaciones.exito('Periodo aplicado', `Las fechas de inscripción se aplicaron a ${n} ${n === 1 ? 'grupo' : 'grupos'}.`);
        this.claves = new Set();
        // Las fechas se limpian para no reutilizarlas por descuido en otro grupo de grupos.
        this.fechaApertura = '';
        this.fechaCierre = '';
        this.cierreTocado = false;
        this.cargar();
      },
      error: err => {
        this.aplicando = false;
        this.notificaciones.error('No se pudo aplicar el periodo', err?.error?.mensaje ?? 'Intente de nuevo.');
      },
    });
  }

  private unicos(valores: string[]): string[] {
    return [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'));
  }
}
