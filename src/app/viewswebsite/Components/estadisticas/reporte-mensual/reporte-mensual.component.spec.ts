import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { ReporteMensualComponent } from './reporte-mensual.component';
import { ReporteMensualService } from 'src/app/services/reporte-mensual.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { OpcionesReporteDTO, ReporteMensualDTO } from 'src/app/Models/DTOs/reporte-mensual-dto';
import { AVISO_FACULTAD, mesActual, mesInicial } from 'src/app/shared/reporte-mensual.util';

const OPCIONES: OpcionesReporteDTO = {
  primerMes: '2020-01', ultimoMes: '2020-03', disciplinas: ['Futbol', 'Voleibol'], modalidades: ['Recreativo', 'Seleccionado', 'Semillero'],
  publicos: ['ESTUDIANTE', 'FUNCIONARIO', 'MIXTO'], vinculos: ['Estudiante', 'Docente', 'Administrativo', 'Contratista'], facultades: ['Ingeniería', 'Salud'],
};

const reporte = (extra: Partial<ReporteMensualDTO> = {}): ReporteMensualDTO => ({
  anio: 2026, mes: 10, filtros: null,
  filas: [
    { modalidad: 'Seleccionado', curso: 'Voleibol', disciplina: 'Voleibol', publico: 'MIXTO', inscritosHombres: 8, inscritosMujeres: 12, inscritosTotal: 20,
      atencionesHombres: 30, atencionesMujeres: 50, atencionesTotal: 80 },
    { modalidad: 'Recreativo', curso: 'Natación', disciplina: 'Natacion', publico: 'ESTUDIANTE', inscritosHombres: 5, inscritosMujeres: 5, inscritosTotal: 10,
      atencionesHombres: 10, atencionesMujeres: 20, atencionesTotal: 30 },
  ],
  totales: { inscritosHombres: 13, inscritosMujeres: 17, inscritosTotal: 30, atencionesHombres: 400, atencionesMujeres: 700, atencionesTotal: 1100,
    personasDistintasInscritas: 28, personasDistintasAtendidas: 25 },
  porVinculo: [{ vinculo: 'Estudiante', inscritos: 20, atenciones: 80 }, { vinculo: 'Docente', inscritos: 10, atenciones: 30 }],
  calidad: { clasesSinConfirmar: 2, atencionesSinInscripcion: 1 },
  ...extra,
});

const VACIO: Partial<ReporteMensualDTO> = {
  filas: [], porVinculo: [],
  totales: { inscritosHombres: 0, inscritosMujeres: 0, inscritosTotal: 0, atencionesHombres: 0, atencionesMujeres: 0, atencionesTotal: 0,
    personasDistintasInscritas: 0, personasDistintasAtendidas: 0 },
  calidad: { clasesSinConfirmar: 0, atencionesSinInscripcion: 0 },
};

/** Reporte mensual (solo Coordinador): estados, filtros combinables, gráficas con tabla equivalente y permisos. */
describe('ReporteMensualComponent', () => {
  let fixture: ComponentFixture<ReporteMensualComponent>;
  let component: ReporteMensualComponent;
  let el: HTMLElement;
  let servicio: jasmine.SpyObj<ReporteMensualService>;
  let perfil$: BehaviorSubject<string>;

  const q = <T extends HTMLElement>(sel: string): T => el.querySelector(sel) as T;
  const qa = (sel: string): HTMLElement[] => Array.from(el.querySelectorAll(sel)) as HTMLElement[];
  const detectar = (): void => fixture.detectChanges();
  const texto = (): string => el.textContent ?? '';
  const poner = (id: string, valor: string): void => {
    const campo = q<HTMLSelectElement>('#' + id);
    campo.value = valor;
    campo.dispatchEvent(new Event('change'));
    detectar();
  };
  const aplicar = (): void => { q<HTMLButtonElement>('form.filtros button[type=submit]').click(); detectar(); };

  const crear = (rol = 'Coordinador'): void => {
    perfil$.next(rol);
    fixture = TestBed.createComponent(ReporteMensualComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    detectar();
  };

  beforeEach(async () => {
    servicio = jasmine.createSpyObj('ReporteMensualService', ['getMensual', 'getOpciones']);
    servicio.getOpciones.and.returnValue(of(OPCIONES));
    servicio.getMensual.and.returnValue(of(reporte()));
    perfil$ = new BehaviorSubject<string>('');
    await TestBed.configureTestingModule({
      imports: [ReporteMensualComponent, RouterTestingModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: ReporteMensualService, useValue: servicio },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: NotificacionService, useValue: jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']) },
      ],
    })
      .overrideComponent(ReporteMensualComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
  });

  // ── Carga inicial y mes ───────────────────────────────────────────────────

  it('Coordinador: pide las opciones y el reporte del mes inicial una sola vez; el selector empieza en el primer mes con datos', () => {
    crear();

    expect(servicio.getOpciones).toHaveBeenCalledTimes(1);
    expect(servicio.getMensual).toHaveBeenCalledTimes(1);
    const mes = q<HTMLSelectElement>('#f-mes');
    const opciones = Array.from(mes.options).map(o => o.value);
    expect(opciones[opciones.length - 1]).toBe('2020-01');            // el más antiguo = primer mes con datos
    expect(opciones[0]).toBe(mesActual());
    expect(mes.value).toBe(mesInicial('2020-01'));                      // abre en el mes anterior
    expect(servicio.getMensual.calls.mostRecent().args[0].mes).toBe(mesInicial('2020-01'));
  });

  it('espera a conocer el perfil: sin perfil no pide nada; al ser Coordinador carga una sola vez aunque el perfil se repita', () => {
    perfil$.next('');
    fixture = TestBed.createComponent(ReporteMensualComponent);
    el = fixture.nativeElement;
    detectar();
    expect(servicio.getOpciones).not.toHaveBeenCalled();

    perfil$.next('Coordinador');
    perfil$.next('Coordinador');
    detectar();
    expect(servicio.getOpciones).toHaveBeenCalledTimes(1);
  });

  // ── Datos ─────────────────────────────────────────────────────────────────

  it('con datos: tarjetas en formato es-CO, tabla de detalle con totales y franja de calidad', () => {
    crear();

    const cifras = qa('.cifra').map(c => c.textContent ?? '');
    expect(cifras[0]).toContain('Inscritos del mes');
    expect(cifras[0]).toContain('30');
    expect(cifras[0]).toContain('13 hombres · 17 mujeres');
    expect(cifras[1]).toContain('1.100');                               // separador de miles es-CO
    expect(cifras[2]).toContain('25');
    expect(cifras[3]).toContain('28');

    const filas = qa('.tabla-detalle tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Voleibol');
    expect(filas[0].textContent).toContain('Toda la comunidad');
    expect(q('.tabla-detalle tfoot').textContent).toContain('1.100');

    const calidad = q('.calidad');
    expect(calidad.getAttribute('role')).toBe('status');
    expect(calidad.classList).toContain('con-alertas');
    expect(calidad.textContent).toContain('2 clases sin confirmar');
    expect(calidad.textContent).toContain('1 atención');
    expect(calidad.textContent).toContain('sin inscripción');
  });

  it('sin alertas de calidad: la franja lo dice, con texto', () => {
    servicio.getMensual.and.returnValue(of(reporte({ calidad: { clasesSinConfirmar: 0, atencionesSinInscripcion: 0 } })));
    crear();
    expect(q('.calidad').classList).not.toContain('con-alertas');
    expect(q('.calidad').textContent).toContain('Sin alertas');
  });

  it('no muestra el sello de datos ilustrativos', () => {
    crear();
    expect(texto().toUpperCase()).not.toContain('ILUSTRATIVO');
  });

  // ── Filtros combinables ───────────────────────────────────────────────────

  it('los filtros se aplican al pulsar "Aplicar": se pide el reporte con todos y se ven como etiquetas', () => {
    crear();
    servicio.getMensual.calls.reset();

    poner('f-disciplina', 'Voleibol');
    poner('f-modalidad', 'Semillero');
    poner('f-publico', 'MIXTO');
    poner('f-genero', 'F');
    poner('f-facultad', 'Ingeniería');
    expect(servicio.getMensual).not.toHaveBeenCalled();                  // aún no se aplican

    aplicar();

    expect(servicio.getMensual).toHaveBeenCalledTimes(1);
    const f = servicio.getMensual.calls.mostRecent().args[0];
    expect(f.disciplina).toBe('Voleibol');
    expect(f.modalidad).toBe('Semillero');
    expect(f.publico).toBe('MIXTO');
    expect(f.genero).toBe('F');
    expect(f.facultad).toBe('Ingeniería');
    const etiquetas = qa('.etiqueta-filtro').map(e => e.textContent ?? '');
    expect(etiquetas.some(e => e.includes('Disciplina: Voleibol'))).toBeTrue();
    expect(etiquetas.some(e => e.includes('Género: Mujeres'))).toBeTrue();
    expect(etiquetas.some(e => e.includes('Público del curso: Toda la comunidad'))).toBeTrue();
  });

  it('vínculo: se marcan los que se quieren, en el orden de siempre, y "Agrupar como Funcionarios" se envía aparte', () => {
    crear();
    servicio.getMensual.calls.reset();

    const casillas = qa('.grupo-vinculo input[type=checkbox]') as HTMLInputElement[];
    expect(casillas.length).toBe(5);
    const marcar = (i: number): void => { casillas[i].checked = true; casillas[i].dispatchEvent(new Event('change')); };
    marcar(3);   // Contratista
    marcar(1);   // Docente
    casillas[4].checked = true; casillas[4].dispatchEvent(new Event('change'));   // Agrupar
    detectar();
    aplicar();

    const f = servicio.getMensual.calls.mostRecent().args[0];
    expect(f.vinculos).toEqual(['Docente', 'Contratista']);
    expect(f.agruparFuncionarios).toBeTrue();
  });

  it('facultad: avisa que administrativos y contratistas no se incluyen, al elegirla y al aplicarla; sin facultad no hay aviso', () => {
    crear();
    expect(texto()).not.toContain(AVISO_FACULTAD);

    poner('f-facultad', 'Salud');
    expect(q('#ayuda-facultad').textContent).toContain(AVISO_FACULTAD);
    expect(q<HTMLSelectElement>('#f-facultad').getAttribute('aria-describedby')).toBe('ayuda-facultad');

    aplicar();
    expect(qa('.banner-info').some(b => (b.textContent ?? '').includes(AVISO_FACULTAD))).toBeTrue();

    poner('f-facultad', '');
    aplicar();
    expect(qa('.banner-info').length).toBe(0);
  });

  it('"Limpiar filtros" deja solo el mes y vuelve a pedir el reporte', () => {
    crear();
    poner('f-genero', 'M');
    aplicar();
    servicio.getMensual.calls.reset();

    q<HTMLButtonElement>('form.filtros .btn-secundario').click();
    detectar();

    const f = servicio.getMensual.calls.mostRecent().args[0];
    expect(f.genero).toBe('');
    expect(f.vinculos).toEqual([]);
    expect(f.mes).toBe(mesInicial('2020-01'));
    expect(qa('.etiqueta-filtro').length).toBe(0);
  });

  // ── Estados ───────────────────────────────────────────────────────────────

  it('cargando: muestra el esqueleto con aviso para lectores de pantalla y no la tabla', () => {
    servicio.getMensual.and.returnValue(new Subject<ReporteMensualDTO>());
    crear();
    expect(component.estado).toBe('cargando');
    expect(q('.estado-carga').getAttribute('aria-busy')).toBe('true');
    expect(q('app-esqueleto')).not.toBeNull();
    expect(q('.tabla-detalle')).toBeNull();
    expect(q<HTMLButtonElement>('form.filtros button[type=submit]').disabled).toBeTrue();
  });

  it('sin datos del mes: lo dice y no confunde con los filtros', () => {
    servicio.getMensual.and.returnValue(of(reporte(VACIO)));
    crear();
    expect(component.estado).toBe('sinDatosDelMes');
    expect(q('.vacio').getAttribute('role')).toBe('status');
    expect(q('.vacio').textContent).toContain('No hay datos de este mes');
    expect(q('.tabla-detalle')).toBeNull();
  });

  it('vacío por filtros: lo dice y ofrece limpiarlos', () => {
    crear();
    servicio.getMensual.and.returnValue(of(reporte(VACIO)));
    poner('f-genero', 'M');
    aplicar();

    expect(component.estado).toBe('vacioPorFiltros');
    expect(q('.vacio').textContent).toContain('Ningún resultado con estos filtros');
    servicio.getMensual.calls.reset();
    servicio.getMensual.and.returnValue(of(reporte()));
    q<HTMLButtonElement>('.vacio .btn-secundario').click();
    detectar();
    expect(servicio.getMensual).toHaveBeenCalledTimes(1);
    expect(component.estado).toBe('listo');
  });

  it('error: aviso con role=alert y "Reintentar" que vuelve a pedir el reporte', () => {
    servicio.getMensual.and.returnValue(throwError(() => ({ status: 500 })));
    crear();
    expect(component.estado).toBe('error');
    expect(q('.banner-error').getAttribute('role')).toBe('alert');

    servicio.getMensual.and.returnValue(of(reporte()));
    q<HTMLButtonElement>('.banner-error button').click();
    detectar();
    expect(component.estado).toBe('listo');
  });

  it('error al cargar las opciones: reintentar vuelve a pedirlas', () => {
    servicio.getOpciones.and.returnValue(throwError(() => ({ status: 0 })));
    crear();
    expect(component.estado).toBe('error');
    expect(servicio.getMensual).not.toHaveBeenCalled();

    servicio.getOpciones.and.returnValue(of(OPCIONES));
    q<HTMLButtonElement>('.banner-error button').click();
    detectar();
    expect(servicio.getMensual).toHaveBeenCalledTimes(1);
  });

  it('403 del backend (en el reporte o en las opciones): "sin permiso", no un error genérico', () => {
    servicio.getMensual.and.returnValue(throwError(() => ({ status: 403 })));
    crear();
    expect(component.estado).toBe('sinPermiso');
    expect(q('.aviso-acceso').getAttribute('role')).toBe('alert');
    expect(q('.aviso-acceso').textContent).toContain('No tiene permiso para ver los reportes');
    expect(q('.banner-error')).toBeNull();
  });

  it('403 en las opciones: también "sin permiso"', () => {
    servicio.getOpciones.and.returnValue(throwError(() => ({ status: 403 })));
    crear();
    expect(component.estado).toBe('sinPermiso');
    expect(servicio.getMensual).not.toHaveBeenCalled();
  });

  for (const rol of ['Alumno', 'Instructor', 'Administrador']) {
    it(`rol ${rol}: no pide nada y muestra "sin permiso" (el backend también respondería 403)`, () => {
      crear(rol);
      expect(servicio.getOpciones).not.toHaveBeenCalled();
      expect(servicio.getMensual).not.toHaveBeenCalled();
      expect(q('.aviso-acceso').textContent).toContain('Solo el Coordinador');
      expect(q('form.filtros')).toBeNull();
    });
  }

  // ── Gráficas, tabla equivalente y accesibilidad ───────────────────────────

  it('cada gráfica tiene descripción para lectores de pantalla con sus cifras', () => {
    crear();
    const graficas = qa('.lienzo');
    expect(graficas.length).toBe(3);
    graficas.forEach(g => expect(g.getAttribute('role')).toBe('img'));
    expect(graficas[1].getAttribute('aria-label')).toContain('Hombres: 400');
    expect(graficas[1].getAttribute('aria-label')).toContain('Mujeres: 700');
    expect(graficas[2].getAttribute('aria-label')).toContain('Estudiante: 80');
  });

  it('leyenda propia con texto (no solo color) y los valores de la dona visibles', () => {
    crear();
    expect(q('.leyenda').textContent).toContain('Hombres');
    expect(q('.leyenda').textContent).toContain('Mujeres');
    expect(q('.resumen-dona').textContent).toContain('Hombres: 400 (36,4 %)');
    expect(q('.resumen-dona').textContent).toContain('Mujeres: 700 (63,6 %)');
  });

  it('"Ver tabla equivalente" cambia las gráficas por tablas con cantidad y porcentaje (es-CO), y "Ver gráficos" vuelve', () => {
    crear();
    const boton = qa('.graficas-cabecera .btn-secundario')[0] as HTMLButtonElement;
    expect(boton.textContent).toContain('Ver tabla equivalente');
    expect(boton.getAttribute('aria-pressed')).toBe('false');

    boton.click();
    detectar();

    expect(boton.getAttribute('aria-pressed')).toBe('true');
    expect(boton.textContent).toContain('Ver gráficos');
    expect(qa('.lienzo').length).toBe(0);
    const tablas = qa('.rejilla-tablas table');
    expect(tablas.length).toBe(2);
    expect(tablas[0].querySelector('caption')!.textContent).toContain('Atenciones por género');
    expect(tablas[0].textContent).toContain('Hombres');
    expect(tablas[0].textContent).toContain('36,4 %');                   // 400 de 1.100 atenciones

    boton.click();
    detectar();
    expect(qa('.lienzo').length).toBe(3);
  });

  it('la medida cambia entre atenciones e inscritos en gráficas y tablas', () => {
    crear();
    const radios = qa('.medida input[type=radio]') as HTMLInputElement[];
    expect(radios[0].checked).toBeTrue();
    radios[1].dispatchEvent(new Event('change'));
    detectar();

    expect(component.medida).toBe('inscritos');
    expect(component.datosGenero).toEqual([{ name: 'Hombres', value: 13 }, { name: 'Mujeres', value: 17 }]);
    expect(q('#titulo-graficas').textContent).toContain('Inscritos del mes');
  });

  it('la tabla de detalle tiene encabezados con alcance y el color no es lo único que distingue a hombres y mujeres', () => {
    crear();
    expect(qa('.tabla-detalle thead th').every(th => th.hasAttribute('scope'))).toBeTrue();
    expect(qa('.tabla-detalle tbody th[scope=row]').length).toBe(2);
    expect(texto()).toContain('Hombres');
    expect(texto()).toContain('Mujeres');
  });

  it('pestañas: "Reporte mensual" activa y enlace a "Clases y horas"', () => {
    crear();
    const pestanas = qa('.pestana');
    expect(pestanas.length).toBe(2);
    expect(pestanas[0].classList).toContain('activa');
    expect(pestanas[0].getAttribute('aria-current')).toBe('page');
    expect(pestanas[1].getAttribute('href')).toBe('/reportes/clases');
  });

  // ── Exportación ───────────────────────────────────────────────────────────

  it('exportar PDF solo está disponible con el reporte listo; Excel queda como pendiente explícito', () => {
    crear();
    const pdf = qa('.filtros-acciones .btn-secundario')[1] as HTMLButtonElement;
    expect(pdf.textContent).toContain('Exportar PDF');
    expect(pdf.disabled).toBeFalse();
    expect(texto()).toContain('La exportación a Excel está pendiente');

    servicio.getMensual.and.returnValue(of(reporte(VACIO)));
    aplicar();
    expect((qa('.filtros-acciones .btn-secundario')[1] as HTMLButtonElement).disabled).toBeTrue();
  });
});
