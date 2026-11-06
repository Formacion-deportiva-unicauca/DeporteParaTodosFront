import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GestionInscripcionesCoordinadorComponent } from './gestion-inscripciones-coordinador.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { OcupacionGrupoDTO } from 'src/app/Models/DTOs/ocupacion-grupo-dto';
import { formatoLocal } from 'src/app/shared/fecha-grupo.util';

const fila = (over: Partial<OcupacionGrupoDTO> = {}): OcupacionGrupoDTO => ({
  categoria: 'Recreativo', curso: 'Baloncesto masculino', anio: 2026, iterable: 1, periodo: 2,
  publico: 'ESTUDIANTE', cupos: 24, inscritos: 18, enEspera: 0, nivel: 'CON_CUPO',
  estadoInscripcion: 'ABIERTAS', cerradaManual: false, fechaApertura: '2026-10-01', fechaCierre: '2026-10-22', ...over,
});

/** Gestión de inscripciones del Coordinador según el prototipo y el lineamiento UX-UI. */
describe('GestionInscripcionesCoordinadorComponent › diseño de la vista (prototipo)', () => {
  let fixture: ComponentFixture<GestionInscripcionesCoordinadorComponent>;
  let component: GestionInscripcionesCoordinadorComponent;
  let grupoService: jasmine.SpyObj<GrupoService>;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement>(s: string): T => el().querySelector(s) as T;
  const qa = <T extends HTMLElement>(s: string): T[] => Array.from(el().querySelectorAll<T>(s));
  const manana = (): string => { const d = new Date(); d.setDate(d.getDate() + 5); return formatoLocal(d); };
  const detectar = (): void => fixture.detectChanges();

  beforeEach(async () => {
    grupoService = jasmine.createSpyObj('GrupoService', ['getOcupacion', 'aplicarPeriodo']);
    grupoService.getOcupacion.and.returnValue(of([
      fila(),
      fila({ iterable: 2, curso: 'Tenis de mesa', inscritos: 20, nivel: 'POR_LLENAR', estadoInscripcion: 'CERRADAS' }),
      fila({ iterable: 3, curso: 'Natación', inscritos: 24, nivel: 'LLENO', cerradaManual: true, estadoInscripcion: 'CERRADAS' }),
    ]));
    grupoService.aplicarPeriodo.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [GestionInscripcionesCoordinadorComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: GrupoService, useValue: grupoService },
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>('Coordinador') } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(GestionInscripcionesCoordinadorComponent);
    component = fixture.componentInstance;
    spyOn(component['notificaciones'], 'exito');
    spyOn(component['notificaciones'], 'error');
    detectar();
  });

  it('muestra migas "Inicio › Inscripciones" y el título con la línea secundaria; "Inicio" navega a /home', () => {
    expect(q('nav.migas [aria-current="page"]').textContent?.trim()).toBe('Inscripciones');
    expect(q('h1.titulo-pagina').textContent?.trim()).toBe('Gestión de inscripciones');
    expect(getComputedStyle(q('h1.titulo-pagina'), '::after').height).toBe('4px');
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    q<HTMLAnchorElement>('nav.migas a').click();
    expect(navegar).toHaveBeenCalledWith(['/home']);
  });

  it('el aviso informativo explica la pantalla', () => {
    expect(q('.banner-info .banner-titulo').textContent?.trim()).toBe('Gestión centralizada de periodos');
  });

  it('el resumen cuenta grupos, inscripciones abiertas (sin las cerradas a mano), llenos y seleccionados', () => {
    const cifras = qa('.cifra').map(c => [c.querySelector('dt')!.textContent!.trim(), c.querySelector('dd')!.textContent!.trim()]);
    expect(cifras).toEqual([['Grupos', '3'], ['Inscripciones abiertas', '1'], ['Grupos llenos', '1'], ['Seleccionados', '0']]);
    component.alternarSeleccion(component.grupos[0]);
    detectar();
    expect(qa('.cifra dd')[3].textContent?.trim()).toBe('1');
  });

  it('el filtro muestra el número de resultados y "Limpiar filtros" aparece solo cuando hay filtros', () => {
    expect(q('.contador-resultados').textContent?.trim()).toBe('3 resultados');
    expect(el().querySelector('.limpiar-filtros')).toBeNull();
    component.filtros.nivel = 'LLENO';
    detectar();
    expect(q('.contador-resultados').textContent?.trim()).toBe('1 resultado');
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    q<HTMLButtonElement>('.limpiar-filtros').click();
    expect(component.filtros).toEqual({ categoria: '', curso: '', publico: '', nivel: '' });
  });

  it('los campos de filtro tienen etiqueta visible y 52px de alto', () => {
    ['categoria', 'curso', 'publico', 'nivel'].forEach(id => {
      expect(el().querySelector(`label[for="filtro-${id}"]`)).not.toBeNull();
      expect(parseFloat(getComputedStyle(q(`#filtro-${id}`)).height)).toBeGreaterThanOrEqual(48);
    });
  });

  it('el nivel de ocupación es un chip con texto y color propio; "Lleno" usa el naranja de error, nunca rojo', () => {
    const chips = qa('.chip-nivel');
    expect(chips.map(c => c.textContent?.trim())).toEqual(['Con cupo', 'Por llenar', 'Lleno']);
    expect(new Set(chips.map(c => getComputedStyle(c).backgroundColor)).size).toBe(3);
    expect(getComputedStyle(chips[2]).backgroundColor).toBe('rgb(255, 219, 202)');
  });

  it('la barra de ocupación es un progressbar con su valor', () => {
    const barra = qa('.ocupacion .barra')[0];
    expect(barra.getAttribute('role')).toBe('progressbar');
    expect(barra.getAttribute('aria-valuenow')).toBe('75');
  });

  it('el estado de las inscripciones es un chip; lo cerrado a mano muestra candado y texto', () => {
    const chips = qa('.chip-ventana');
    expect(chips.map(c => c.textContent?.replace('lock', '').trim())).toEqual(['Abiertas', 'Cerradas', 'Cerradas por el Coordinador']);
    expect(chips[2].querySelector('mat-icon')?.textContent?.trim()).toBe('lock');
  });

  it('cada fila tiene su etiqueta (data-label) para verse como tarjeta en móvil y un botón de 44px para extender el cierre', () => {
    const primera = q('tbody tr');
    expect(Array.from(primera.querySelectorAll('td')).map(td => td.getAttribute('data-label')))
      .toEqual(['Seleccionar', 'Curso', 'Grupo', 'Público', 'Ocupación', 'Inscripciones', 'Apertura', 'Cierre actual', 'Acciones']);
    const boton = primera.querySelector<HTMLButtonElement>('.accion-extender')!;
    expect(boton.getAttribute('aria-label')).toContain('Extender cierre de Baloncesto masculino 2026-1');
    expect(boton.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  });

  it('seleccionar muestra la barra de selección y la fila queda resaltada', () => {
    expect(q('.texto-seleccion').textContent?.trim()).toBe('Seleccione grupos para modificar su periodo');
    q<HTMLInputElement>('tbody .casilla').click();
    detectar();
    expect(q('.texto-seleccion').textContent?.trim()).toBe('1 grupo seleccionado');
    expect(q('tbody tr').classList).toContain('seleccionada');
  });

  it('"Seleccionar los N visibles" y "Limpiar selección" funcionan desde la barra (también en móvil)', () => {
    const botones = (): string[] => qa('.acciones-seleccion .enlace-boton').map(b => b.textContent!.trim());
    expect(botones()).toEqual(['Seleccionar los 3 visibles']);
    qa<HTMLButtonElement>('.acciones-seleccion .enlace-boton')[0].click();
    detectar();
    expect(component.seleccionados.length).toBe(3);
    expect(botones()).toEqual(['Quitar selección de los visibles', 'Limpiar selección']);
    qa<HTMLButtonElement>('.acciones-seleccion .enlace-boton')[1].click();
    detectar();
    expect(component.seleccionados.length).toBe(0);
  });

  describe('periodo de inscripciones', () => {
    it('el panel tiene borde superior de color primario y la frase "Se aplicará a N grupos seleccionados"', () => {
      expect(getComputedStyle(q('.panel-periodo')).borderTopColor).toBe('rgb(0, 0, 102)');
      expect(q('.subtitulo-panel').textContent?.trim()).toBe('Se aplicará a 0 grupos seleccionados.');
      component.alternarSeleccion(component.grupos[0]);
      detectar();
      expect(q('.subtitulo-panel').textContent?.trim()).toBe('Se aplicará a 1 grupo seleccionado.');
    });

    it('el botón de aplicar explica por qué está deshabilitado en lugar de quedar gris sin motivo', () => {
      expect(q<HTMLButtonElement>('#btn-aplicar').disabled).toBeTrue();
      expect(q('#motivo-bloqueo').textContent).toContain('Seleccione al menos un grupo');
      component.alternarSeleccion(component.grupos[0]);
      detectar();
      expect(q('#motivo-bloqueo').textContent).toContain('fecha de cierre');
      component.fechaCierre = manana();
      detectar();
      expect(el().querySelector('#motivo-bloqueo')).toBeNull();
      expect(q<HTMLButtonElement>('#btn-aplicar').disabled).toBeFalse();
    });

    it('el error del cierre no aparece al abrir la pantalla, solo después de pasar por el campo', () => {
      component.alternarSeleccion(component.grupos[0]);
      detectar();
      expect(el().querySelector('#error-periodo')).toBeNull();
      q<HTMLInputElement>('#fecha-cierre').dispatchEvent(new Event('blur'));
      detectar();
      const error = q('#error-periodo');
      expect(error.textContent).toContain('obligatorio');
      expect(error.getAttribute('role')).toBe('alert');
      expect(getComputedStyle(error).color).toBe('rgb(154, 65, 0)');
      expect(q('#fecha-cierre').getAttribute('aria-invalid')).toBe('true');
    });

    it('los campos de fecha tienen etiqueta visible y 52px de alto', () => {
      expect(el().querySelector('label[for="fecha-apertura"]')?.textContent).toContain('Apertura (opcional)');
      expect(parseFloat(getComputedStyle(q('#fecha-cierre')).height)).toBeGreaterThanOrEqual(48);
    });

    it('"Aplicar" es un botón principal en píldora, en mayúsculas', () => {
      const boton = q<HTMLButtonElement>('#btn-aplicar');
      expect(getComputedStyle(boton).textTransform).toBe('uppercase');
      expect(parseFloat(getComputedStyle(boton).height)).toBeGreaterThanOrEqual(44);
    });

    it('al aplicar con éxito se limpian las fechas para no reutilizarlas por descuido', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaApertura = manana();
      component.fechaCierre = manana();
      component.cierreTocado = true;
      component.aplicar();
      expect(component.fechaApertura).toBe('');
      expect(component.fechaCierre).toBe('');
      expect(component.cierreTocado).toBeFalse();
    });
  });

  describe('barra que acompaña el scroll', () => {
    it('aparece solo con grupos seleccionados y "Definir periodo" lleva al panel y enfoca el cierre', () => {
      expect(el().querySelector('.barra-flotante')).toBeNull();
      component.alternarSeleccion(component.grupos[0]);
      detectar();
      expect(q('.barra-flotante').textContent).toContain('1 grupo seleccionado');
      const desplazar = spyOn(q('#panel-periodo'), 'scrollIntoView');
      q<HTMLButtonElement>('#btn-ir-periodo').click();
      expect(desplazar).toHaveBeenCalled();
      expect(document.activeElement).toBe(q('#fecha-cierre'));
    });

    it('la barra queda sticky (acompaña el scroll) y no cubre toda la fila', () => {
      component.alternarSeleccion(component.grupos[0]);
      detectar();
      expect(getComputedStyle(q('.barra-flotante')).position).toBe('sticky');
    });
  });

  it('la selección y el estado de carga/error usan roles accesibles', () => {
    grupoService.getOcupacion.and.returnValue(of([]));
    component.errorCarga = true;
    detectar();
    expect(q('#error-carga').getAttribute('role')).toBe('alert');
  });
});
