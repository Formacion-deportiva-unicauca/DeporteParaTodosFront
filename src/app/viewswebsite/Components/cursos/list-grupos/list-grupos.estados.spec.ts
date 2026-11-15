import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { ListGruposComponent } from './list-grupos.component';
import { GrupoService } from 'src/app/services/grupo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { InstructorServisce } from 'src/app/services/instructor.service';
import { HorarioService } from 'src/app/services/horario.service';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { InscripcionesService } from 'src/app/services/inscripciones.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

const grupo = (iterable: number) =>
  ({ anio: 2026, periodo: 1, iterable, estadoGrupo: 'ACTIVO', idInstructor: null } as any);

/** Estados de la lista de grupos de un curso: cargando, vacío y error. */
describe('ListGruposComponent › estados de carga', () => {
  let fixture: ComponentFixture<ListGruposComponent>;
  let el: HTMLElement;
  let grupos: jasmine.SpyObj<GrupoService>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil$: BehaviorSubject<string>;
  let imagenes: jasmine.SpyObj<ImagenService>;
  let idImagenCurso: number | null;

  const texto = (): string => el.textContent ?? '';
  const esqueletos = (): number => el.querySelectorAll('app-esqueleto').length;

  const crear = (): void => {
    fixture = TestBed.createComponent(ListGruposComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    grupos = jasmine.createSpyObj('GrupoService', ['getGrupos', 'cambiarCierreInscripciones']);
    grupos.getGrupos.and.returnValue(of([]));
    imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    imagenes.getimagen.and.returnValue(of({} as any));
    idImagenCurso = null;
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil$ = new BehaviorSubject<string>('Alumno');

    await TestBed.configureTestingModule({
      imports: [ListGruposComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: GrupoService, useValue: grupos },
        { provide: CursodeportivoService, useValue: { getCurso: () => of({ nombre: 'Natación', deporte: 'F', categoriaCurso: 'Recreativo', descripcion: 'D', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', idImagen: idImagenCurso }) } },
        { provide: ImagenService, useValue: imagenes },
        { provide: InstructorServisce, useValue: { getInstructor: () => of({}) } },
        { provide: HorarioService, useValue: { getHorarios: () => of([]) } },
        { provide: InscripcionesService, useValue: { getDisponibilidad: () => of({ cuposTotales: 10, cuposDisponibles: 4, tamanoListaEspera: 0 }) } },
        { provide: NotificacionService, useValue: avisos },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ categoria: 'Recreativo', curso: 'Natación' })) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ListGruposComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
  });

  it('cargando: tarjetas esqueleto, sin aviso de vacío ni contador de grupos', () => {
    grupos.getGrupos.and.returnValue(new Subject<any[]>());
    crear();
    expect(esqueletos()).toBe(1);
    expect(el.querySelector('.rejilla-grupos')!.getAttribute('aria-busy')).toBe('true');
    expect(texto()).not.toContain('aún no tiene grupos');
    expect(el.querySelector('.contador-grupos')).toBeNull();
  });

  it('cargada con grupos: sin esqueletos, con tarjetas y contador', () => {
    grupos.getGrupos.and.returnValue(of([grupo(1), grupo(2)]));
    crear();
    expect(esqueletos()).toBe(0);
    expect(el.querySelectorAll('mat-card.tarjeta-grupo').length).toBe(2);
    expect(el.querySelector('.contador-grupos')!.textContent).toContain('2 grupos registrados');
  });

  it('vacía: "Este curso aún no tiene grupos." sin esqueletos', () => {
    crear();
    expect(texto()).toContain('Este curso aún no tiene grupos.');
    expect(esqueletos()).toBe(0);
  });

  it('del esqueleto al vacío: mientras carga no dice que no hay grupos', () => {
    const lista$ = new Subject<any[]>();
    grupos.getGrupos.and.returnValue(lista$);
    crear();
    expect(texto()).not.toContain('aún no tiene grupos');
    lista$.next([]);
    fixture.detectChanges();
    expect(texto()).toContain('Este curso aún no tiene grupos.');
  });

  it('error: mensaje de alerta y aviso, sin confundirse con "no hay grupos"', () => {
    spyOn(console, 'error');
    grupos.getGrupos.and.returnValue(throwError(() => ({ status: 500 })));
    crear();
    expect(el.querySelector('.aviso-error[role="alert"]')?.textContent).toContain('No se pudieron cargar los grupos');
    expect(avisos.error).toHaveBeenCalledOnceWith('No se pudieron cargar los grupos', 'Revise su conexión e intente de nuevo.');
    expect(texto()).not.toContain('aún no tiene grupos');
    expect(esqueletos()).toBe(0);
  });

  it('los mismos estados para el Coordinador', () => {
    perfil$.next('Coordinador');
    grupos.getGrupos.and.returnValue(new Subject<any[]>());
    crear();
    expect(esqueletos()).toBe(1);
  });

  describe('imagen del curso', () => {
    const imagenResumen = (): HTMLImageElement | null => el.querySelector('img.resumen-imagen');
    const esqueletoImagen = (): Element | null => el.querySelector('.resumen-imagen-esqueleto app-esqueleto[forma="imagen"]');

    it('cargando: esqueleto con altura mínima y sin la imagen genérica de relleno', () => {
      idImagenCurso = 7;
      imagenes.getimagen.and.returnValue(new Subject<any>());
      crear();
      expect(esqueletoImagen()).not.toBeNull();
      expect(imagenResumen()).toBeNull();
      expect(imagenes.getimagen).toHaveBeenCalledWith(7);
      expect(getComputedStyle(el.querySelector('.resumen-imagen-esqueleto')!).minHeight).toBe('110px');
    });

    it('llegó: reemplaza el esqueleto por la imagen del curso', () => {
      idImagenCurso = 7;
      const img$ = new Subject<any>();
      imagenes.getimagen.and.returnValue(img$);
      crear();
      img$.next({ datosBase64: 'AAAA', tipoArchivo: 'image/png' });
      fixture.detectChanges();
      expect(esqueletoImagen()).toBeNull();
      expect(imagenResumen()!.src).toContain('data:image/png;base64,AAAA');
      expect(avisos.error).not.toHaveBeenCalled();
    });

    it('falló: un solo aviso, sin esqueleto, y deporte.jpg queda como respaldo', () => {
      idImagenCurso = 7;
      imagenes.getimagen.and.returnValue(throwError(() => ({ status: 500 })));
      crear();
      const deImagen = avisos.error.calls.allArgs().filter(a => a[0] === 'No se pudo cargar la imagen del curso');
      expect(deImagen.length).toBe(1);
      expect(esqueletoImagen()).toBeNull();
      expect(imagenResumen()!.src).toContain('assets/imagesSystem/deporte.jpg');
    });

    it('curso sin imagen: usa deporte.jpg de respaldo, sin esqueleto ni petición de imagen', () => {
      idImagenCurso = null;
      crear();
      expect(imagenes.getimagen).not.toHaveBeenCalled();
      expect(esqueletoImagen()).toBeNull();
      expect(imagenResumen()!.src).toContain('assets/imagesSystem/deporte.jpg');
    });
  });
});
