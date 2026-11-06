import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { GestionInscripcionesCoordinadorComponent } from './gestion-inscripciones-coordinador.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { AuthService } from 'src/app/services/auth.service';
import { OcupacionGrupoDTO } from 'src/app/Models/DTOs/ocupacion-grupo-dto';
import { formatoLocal } from 'src/app/shared/fecha-grupo.util';

function fila(over: Partial<OcupacionGrupoDTO> = {}): OcupacionGrupoDTO {
  return {
    categoria: 'Formativo', curso: 'Fútbol', anio: 2026, iterable: 1, periodo: 1,
    publico: 'MIXTO', cupos: 20, inscritos: 5, enEspera: 0, nivel: 'CON_CUPO',
    estadoInscripcion: 'ABIERTAS', cerradaManual: false,
    fechaApertura: '2026-01-01', fechaCierre: '2026-12-31', ...over,
  };
}

describe('GestionInscripcionesCoordinadorComponent', () => {
  let component: GestionInscripcionesCoordinadorComponent;
  let fixture: ComponentFixture<GestionInscripcionesCoordinadorComponent>;
  let grupoService: jasmine.SpyObj<GrupoService>;
  let perfil$: BehaviorSubject<string>;

  const enDias = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return formatoLocal(d); };

  const datos = [
    fila(),
    fila({ iterable: 2, inscritos: 16, nivel: 'POR_LLENAR' }),
    fila({ curso: 'Natación', categoria: 'Acuáticos', inscritos: 20, nivel: 'LLENO', publico: 'ESTUDIANTE' }),
    fila({ curso: 'Yoga', categoria: 'Acuáticos', publico: 'FUNCIONARIO', estadoInscripcion: 'CERRADAS', cerradaManual: true }),
  ];

  // `url` simula la dirección con la que se abre la pantalla (por ejemplo al volver con "atrás").
  async function crear(perfil = 'Coordinador', url = '/') {
    perfil$ = new BehaviorSubject<string>(perfil);
    grupoService = jasmine.createSpyObj('GrupoService', ['getOcupacion', 'aplicarPeriodo']);
    grupoService.getOcupacion.and.returnValue(of(datos));
    grupoService.aplicarPeriodo.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [GestionInscripcionesCoordinadorComponent, NoopAnimationsModule],
      providers: [
        { provide: GrupoService, useValue: grupoService },
        { provide: PerfilService, useValue: { perfil$ } },
        { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['login', 'logout', 'getProfile', 'isAuthenticated', 'verificarUsuario']) },
        provideRouter([]),
      ],
    }).compileComponents();

    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(GestionInscripcionesCoordinadorComponent);
    component = fixture.componentInstance;
    spyOn(component['notificaciones'], 'exito');
    spyOn(component['notificaciones'], 'error');
    fixture.detectChanges();
  }

  describe('como Coordinador', () => {
    beforeEach(async () => await crear());

    it('carga la ocupación al iniciar', () => {
      expect(grupoService.getOcupacion).toHaveBeenCalledTimes(1);
      expect(component.grupos.length).toBe(4);
    });

    it('lista las categorías y los cursos sin repetir; los cursos dependen de la categoría elegida', () => {
      expect(component.categorias).toEqual(['Acuáticos', 'Formativo']);
      component.filtros.categoria = 'Acuáticos';
      expect(component.cursos).toEqual(['Natación', 'Yoga']);
    });

    it('filtra por categoría, curso, público y nivel', () => {
      component.filtros.categoria = 'Formativo';
      expect(component.filtrados.length).toBe(2);
      component.filtros.categoria = '';
      component.filtros.publico = 'ESTUDIANTE';
      expect(component.filtrados.map(g => g.curso)).toEqual(['Natación']);
      component.filtros.publico = '';
      component.filtros.nivel = 'POR_LLENAR';
      expect(component.filtrados.length).toBe(1);
      expect(component.filtrados[0].iterable).toBe(2);
    });

    it('al cambiar la categoría limpia el curso que ya no corresponde', () => {
      component.filtros.categoria = 'Formativo';
      component.filtros.curso = 'Fútbol';
      component.alCambiarCategoria('Acuáticos');
      expect(component.filtros.curso).toBe('');
    });

    it('porcentaje de ocupación: inscritos sobre cupos, sin pasar de 100 y 0 si no hay cupos', () => {
      expect(component.porcentaje(fila({ inscritos: 16, cupos: 20 }))).toBe(80);
      expect(component.porcentaje(fila({ inscritos: 25, cupos: 20 }))).toBe(100);
      expect(component.porcentaje(fila({ cupos: null }))).toBe(0);
    });

    it('textos y clases del nivel de ocupación', () => {
      expect(component.textoNivel('LLENO')).toBe('Lleno');
      expect(component.textoNivel('POR_LLENAR')).toBe('Por llenar');
      expect(component.textoNivel('CON_CUPO')).toBe('Con cupo');
      expect(component.claseNivel('LLENO')).toBe('nivel-lleno');
      expect(component.claseNivel('POR_LLENAR')).toBe('nivel-por-llenar');
      expect(component.claseNivel('CON_CUPO')).toBe('nivel-con-cupo');
    });

    it('selecciona y deselecciona un grupo', () => {
      const g = component.grupos[0];
      component.alternarSeleccion(g);
      expect(component.estaSeleccionado(g)).toBeTrue();
      expect(component.seleccionados.length).toBe(1);
      component.alternarSeleccion(g);
      expect(component.estaSeleccionado(g)).toBeFalse();
    });

    it('"seleccionar todos" marca solo los filtrados y vuelve a quitarlos', () => {
      component.filtros.categoria = 'Formativo';
      component.alternarTodos();
      expect(component.seleccionados.length).toBe(2);
      expect(component.todosSeleccionados).toBeTrue();
      component.alternarTodos();
      expect(component.seleccionados.length).toBe(0);
    });

    it('la selección sobrevive al cambiar el filtro', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.filtros.categoria = 'Acuáticos';
      expect(component.seleccionados.length).toBe(1);
    });

    it('"Extender cierre" de una fila deja seleccionado solo ese grupo', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.extender(component.grupos[1]);
      expect(component.seleccionados.length).toBe(1);
      expect(component.seleccionados[0].iterable).toBe(2);
    });

    // ── validación del periodo ──

    it('sin cierre: error de cierre obligatorio y no se puede aplicar', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = '';
      expect(component.errorPeriodo).toBe('El cierre de inscripciones es obligatorio');
      expect(component.puedeAplicar).toBeFalse();
    });

    it('cierre anterior a la apertura: error', () => {
      component.fechaApertura = enDias(10);
      component.fechaCierre = enDias(5);
      expect(component.errorPeriodo).toContain('no puede ser anterior');
    });

    it('cierre en el pasado: error', () => {
      component.fechaCierre = enDias(-1);
      expect(component.errorPeriodo).toContain('ya pasó');
    });

    it('cierre válido pero sin grupos seleccionados: no se puede aplicar', () => {
      component.fechaCierre = enDias(30);
      expect(component.errorPeriodo).toBeNull();
      expect(component.puedeAplicar).toBeFalse();
    });

    it('cierre válido y grupos seleccionados: se puede aplicar', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = enDias(30);
      expect(component.puedeAplicar).toBeTrue();
    });

    // ── aplicar ──

    it('aplicar envía apertura, cierre y las claves de los grupos seleccionados', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.alternarSeleccion(component.grupos[1]);
      component.fechaApertura = enDias(1);
      component.fechaCierre = enDias(30);

      component.aplicar();

      expect(grupoService.aplicarPeriodo).toHaveBeenCalledWith({
        fechaApertura: enDias(1),
        fechaCierre: enDias(30),
        grupos: [
          { categoria: 'Formativo', curso: 'Fútbol', anio: 2026, iterable: 1 },
          { categoria: 'Formativo', curso: 'Fútbol', anio: 2026, iterable: 2 },
        ],
      });
    });

    it('sin apertura envía null (conserva la de cada grupo)', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = enDias(30);
      component.aplicar();
      expect(grupoService.aplicarPeriodo.calls.mostRecent().args[0].fechaApertura).toBeNull();
    });

    it('si el periodo no es válido, aplicar no llama al servicio', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = '';
      component.aplicar();
      expect(grupoService.aplicarPeriodo).not.toHaveBeenCalled();
    });

    it('al aplicar con éxito avisa, limpia la selección y recarga la ocupación', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = enDias(30);
      grupoService.getOcupacion.calls.reset();

      component.aplicar();

      expect(component['notificaciones'].exito).toHaveBeenCalledOnceWith('Periodo aplicado', jasmine.stringContaining('1 grupo'));
      expect(component.seleccionados.length).toBe(0);
      expect(grupoService.getOcupacion).toHaveBeenCalledTimes(1);
    });

    it('si el servidor rechaza (422) muestra su mensaje y conserva la selección', () => {
      grupoService.aplicarPeriodo.and.returnValue(throwError(() => ({ status: 422, error: { mensaje: 'Fechas inválidas' } })));
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = enDias(30);

      component.aplicar();

      expect(component['notificaciones'].error).toHaveBeenCalledOnceWith('No se pudo aplicar el periodo', 'Fechas inválidas');
      expect(component.seleccionados.length).toBe(1);
      expect(component.aplicando).toBeFalse();
    });

    it('si falla la carga muestra el error y permite reintentar', () => {
      grupoService.getOcupacion.and.returnValue(throwError(() => ({ status: 500 })));
      component.cargar();
      expect(component.errorCarga).toBeTrue();
      expect(component.cargando).toBeFalse();
    });

    it('muestra la vista previa de los grupos seleccionados en el DOM', () => {
      component.alternarSeleccion(component.grupos[0]);
      component.fechaCierre = enDias(30);
      fixture.detectChanges();
      const previa = fixture.nativeElement.querySelector('#vista-previa');
      expect(previa).toBeTruthy();
      expect(previa.textContent).toContain('Fútbol');
    });

    it('no pinta la vista previa si no hay selección', () => {
      expect(fixture.nativeElement.querySelector('#vista-previa')).toBeNull();
    });
  });

  describe('enlaces directos a cursos y grupos', () => {
    beforeEach(async () => await crear());

    it('el nombre del curso enlaza a la lista de grupos de ese curso', () => {
      const enlace: HTMLAnchorElement = fixture.nativeElement.querySelector('a.enlace-curso');
      expect(enlace.getAttribute('href')).toBe('/list-grupos/Formativo/F%C3%BAtbol');
      expect(enlace.textContent).toContain('Fútbol');
    });

    it('el número de grupo enlaza a la planilla de deportistas de ese grupo', () => {
      const enlace: HTMLAnchorElement = fixture.nativeElement.querySelector('a.enlace-grupo');
      expect(enlace.getAttribute('href')).toBe('/listaDeportistasCurso/Formativo/F%C3%BAtbol/2026/1');
      expect(enlace.textContent).toContain('2026-1');
    });

    it('hay un enlace de curso y uno de grupo por cada fila', () => {
      expect(fixture.nativeElement.querySelectorAll('a.enlace-curso').length).toBe(4);
      expect(fixture.nativeElement.querySelectorAll('a.enlace-grupo').length).toBe(4);
    });

    it('la tabla muestra la apertura y el cierre actuales', () => {
      const encabezados = Array.from(fixture.nativeElement.querySelectorAll('th')).map((th: any) => th.textContent.trim());
      expect(encabezados).toContain('Apertura');
      expect(encabezados).toContain('Cierre actual');
      const primera = fixture.nativeElement.querySelector('tbody tr').textContent;
      expect(primera).toContain('01/01/2026');
      expect(primera).toContain('31/12/2026');
    });
  });

  describe('filtros guardados en la URL', () => {
    it('al abrir con parámetros los aplica a los filtros', async () => {
      await crear('Coordinador', '/?categoria=Acu%C3%A1ticos&curso=Yoga&publico=FUNCIONARIO&nivel=CON_CUPO');
      expect(component.filtros).toEqual({ categoria: 'Acuáticos', curso: 'Yoga', publico: 'FUNCIONARIO', nivel: 'CON_CUPO' });
      expect(component.filtrados.length).toBe(1);
    });

    it('ignora valores desconocidos de público y nivel', async () => {
      await crear('Coordinador', '/?publico=XX&nivel=YY');
      expect(component.filtros.publico).toBe('');
      expect(component.filtros.nivel).toBe('');
    });

    it('sin parámetros los filtros quedan vacíos', async () => {
      await crear();
      expect(component.filtros).toEqual({ categoria: '', curso: '', publico: '', nivel: '' });
    });

    it('al cambiar un filtro actualiza la URL sin añadir una entrada al historial', async () => {
      await crear();
      const navegar = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      component.filtros.categoria = 'Formativo';
      component.alCambiarFiltro();
      const [comandos, extras] = navegar.calls.mostRecent().args as [any[], any];
      expect(comandos).toEqual([]);
      expect(extras.queryParams).toEqual({ categoria: 'Formativo', curso: null, publico: null, nivel: null });
      expect(extras.replaceUrl).toBeTrue();
    });

    it('al cambiar la categoría también actualiza la URL', async () => {
      await crear();
      const navegar = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
      component.alCambiarCategoria('Acuáticos');
      expect(navegar).toHaveBeenCalled();
      expect(navegar.calls.mostRecent().args[1]!.queryParams!['categoria']).toBe('Acuáticos');
    });
  });

  describe('sin ser Coordinador', () => {
    beforeEach(async () => await crear('Alumno'));

    it('no carga la ocupación y muestra el aviso de acceso', () => {
      expect(grupoService.getOcupacion).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('Solo el Coordinador');
    });
  });
});
