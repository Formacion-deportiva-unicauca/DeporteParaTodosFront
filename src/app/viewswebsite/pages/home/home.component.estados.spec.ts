import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';
import { HeaderComponent } from '../header/header.component';
import { SidenavComponent } from '../sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { CategoriaService } from 'src/app/services/categoria.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { EstadoSesionService } from 'src/app/shared/estado-sesion.service';

const categoria = (titulo: string, imagenId: number | null = null) =>
  ({ titulo, descripcion: `Descripción de ${titulo}`, imagenId } as any);

/** Estados del home: sesión resolviéndose, cargando, vacío, error y fallo de imágenes. */
describe('HomeComponent › estados de carga', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let el: HTMLElement;
  let estado: EstadoSesionService;
  let categorias: jasmine.SpyObj<CategoriaService>;
  let imagenes: jasmine.SpyObj<ImagenService>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil$: BehaviorSubject<string>;
  let tokenReady$: Subject<void>;

  const texto = (): string => el.textContent ?? '';
  const esqueletos = (forma?: string): number =>
    Array.from(el.querySelectorAll('app-esqueleto')).filter(e => !forma || e.getAttribute('forma') === forma).length;

  /** Crea el home. `conToken` imita una visita con dpt_token ya guardado. */
  const crear = (opciones: { conToken?: boolean } = {}): void => {
    if (opciones.conToken) sessionStorage.setItem('dpt_token', 'token-de-prueba');
    estado = TestBed.inject(EstadoSesionService);
    fixture = TestBed.createComponent(HomeComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    sessionStorage.removeItem('dpt_token');
    categorias = jasmine.createSpyObj('CategoriaService', ['getCategorias']);
    categorias.getCategorias.and.returnValue(of([]));
    imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil$ = new BehaviorSubject<string>('');
    tokenReady$ = new Subject<void>();

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: categorias },
        { provide: ImagenService, useValue: imagenes },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: TokenInterchangeService, useValue: { tokenReady$: tokenReady$.asObservable() } },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } },
        { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } },
        { provide: NotificacionService, useValue: avisos },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(HomeComponent, {
        remove: { imports: [HeaderComponent, SidenavComponent] },
        add: { imports: [SidenavStub], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  afterEach(() => sessionStorage.removeItem('dpt_token'));

  describe('sesión', () => {
    it('resolviéndose (Google acaba de redirigir): "Iniciando sesión…" con spinner y sin cabecera de visitante ni categorías', () => {
      crear();
      estado.resolviendo();
      fixture.detectChanges();
      expect(el.querySelector('.iniciando-sesion')).not.toBeNull();
      expect(el.querySelector('.spinner-sesion')).not.toBeNull();
      expect(texto()).toContain('Iniciando sesión…');
      expect(el.querySelector('app-header')).toBeNull();
      expect(el.querySelector('.rejilla')).toBeNull();
    });

    it('el aviso de "Iniciando sesión…" se anuncia a los lectores de pantalla', () => {
      crear();
      estado.resolviendo();
      fixture.detectChanges();
      const aviso = el.querySelector('.iniciando-sesion')!;
      expect(aviso.getAttribute('role')).toBe('status');
      expect(aviso.getAttribute('aria-live')).toBe('polite');
    });

    it('sesión iniciada: sale el home con las categorías cargándose', () => {
      const lista$ = new Subject<any[]>();
      categorias.getCategorias.and.returnValue(lista$);
      crear();
      estado.resolviendo();
      fixture.detectChanges();
      expect(el.querySelector('.iniciando-sesion')).not.toBeNull();

      sessionStorage.setItem('dpt_token', 'token-de-prueba');
      estado.activa();
      tokenReady$.next();
      fixture.detectChanges();

      expect(el.querySelector('.iniciando-sesion')).toBeNull();
      expect(el.querySelector('.rejilla')).not.toBeNull();
      expect(esqueletos('tarjeta')).toBe(1);
      expect(categorias.getCategorias).toHaveBeenCalledTimes(1);
    });

    it('fallo del intercambio (vuelve a visitante): desaparece el spinner y se ve el home normal con cabecera', () => {
      crear();
      estado.resolviendo();
      fixture.detectChanges();
      estado.visitante();
      fixture.detectChanges();
      expect(el.querySelector('.iniciando-sesion')).toBeNull();
      expect(el.querySelector('app-header')).not.toBeNull();
      expect(texto()).toContain('Categorías deportivas');
    });

    it('visitante sin sesión ni intercambio: home normal, sin spinner, sin esqueletos y sin pedir categorías', () => {
      crear();
      expect(el.querySelector('.iniciando-sesion')).toBeNull();
      expect(el.querySelector('app-header')).not.toBeNull();
      expect(esqueletos()).toBe(0);
      expect(categorias.getCategorias).not.toHaveBeenCalled();
      expect(texto()).not.toContain('No hay categorías disponibles');
    });
  });

  describe('lista de categorías', () => {
    it('cargando: muestra tarjetas esqueleto y NO el mensaje de vacío', () => {
      categorias.getCategorias.and.returnValue(new Subject<any[]>());
      crear({ conToken: true });
      expect(esqueletos('tarjeta')).toBe(1);
      expect(el.querySelector('.rejilla')!.getAttribute('aria-busy')).toBe('true');
      expect(texto()).not.toContain('No hay categorías disponibles');
      expect(el.querySelector('mat-card.tarjeta-categoria')).toBeNull();
    });

    it('cargada con datos: quita los esqueletos y muestra las tarjetas', () => {
      categorias.getCategorias.and.returnValue(of([categoria('Recreativo'), categoria('Semillero')]));
      crear({ conToken: true });
      expect(esqueletos()).toBe(0);
      expect(el.querySelectorAll('mat-card.tarjeta-categoria').length).toBe(2);
      expect(texto()).not.toContain('No hay categorías disponibles');
      expect(el.querySelector('.rejilla')!.getAttribute('aria-busy')).toBe('false');
    });

    it('vacía: "No hay categorías disponibles." (distinto de cargando) y sin esqueletos', () => {
      categorias.getCategorias.and.returnValue(of([]));
      crear({ conToken: true });
      expect(texto()).toContain('No hay categorías disponibles.');
      expect(esqueletos()).toBe(0);
    });

    it('del esqueleto al vacío: mientras llega no dice "no hay"; al llegar vacía, sí', () => {
      const lista$ = new Subject<any[]>();
      categorias.getCategorias.and.returnValue(lista$);
      crear({ conToken: true });
      expect(texto()).not.toContain('No hay categorías disponibles');
      lista$.next([]);
      fixture.detectChanges();
      expect(texto()).toContain('No hay categorías disponibles.');
      expect(esqueletos()).toBe(0);
    });

    it('error: mensaje con rol alerta, aviso de error y NO el estado vacío', () => {
      spyOn(console, 'error');
      categorias.getCategorias.and.returnValue(throwError(() => ({ status: 500 })));
      crear({ conToken: true });
      const alerta = el.querySelector('.aviso-estado[role="alert"]');
      expect(alerta?.textContent).toContain('No se pudieron cargar las categorías');
      expect(avisos.error).toHaveBeenCalledOnceWith('No se pudieron cargar las categorías', 'Revise su conexión e intente de nuevo.');
      expect(texto()).not.toContain('No hay categorías disponibles');
      expect(esqueletos()).toBe(0);
    });
  });

  describe('imágenes', () => {
    it('mientras llega la imagen la tarjeta muestra un esqueleto (no la imagen genérica)', () => {
      const img$ = new Subject<any>();
      imagenes.getimagen.and.returnValue(img$);
      categorias.getCategorias.and.returnValue(of([categoria('Recreativo', 7)]));
      crear({ conToken: true });
      expect(esqueletos('imagen')).toBe(1);
      expect(el.querySelector('.img-container img')).toBeNull();

      img$.next({ datosBase64: 'AAAA', tipoArchivo: 'image/png' });
      fixture.detectChanges();
      expect(esqueletos('imagen')).toBe(0);
      expect(el.querySelector<HTMLImageElement>('.img-container img')!.src).toContain('data:image/png;base64,AAAA');
    });

    it('una categoría sin imagen usa la genérica de inmediato, sin esqueleto', () => {
      categorias.getCategorias.and.returnValue(of([categoria('Recreativo', null)]));
      crear({ conToken: true });
      expect(esqueletos('imagen')).toBe(0);
      expect(el.querySelector<HTMLImageElement>('.img-container img')!.src).toContain('assets/imagesSystem/deporte.jpg');
    });

    it('si fallan varias imágenes avisa una sola vez y esas tarjetas quedan con la genérica', () => {
      spyOn(console, 'error');
      imagenes.getimagen.and.returnValue(throwError(() => ({ status: 500 })));
      categorias.getCategorias.and.returnValue(of([categoria('A', 1), categoria('B', 2), categoria('C', 3)]));
      crear({ conToken: true });
      const avisosDeImagen = avisos.error.calls.allArgs().filter(a => a[0] === 'No se pudieron cargar algunas imágenes');
      expect(avisosDeImagen.length).toBe(1);
      expect(esqueletos('imagen')).toBe(0);
      expect(el.querySelectorAll('.img-container img').length).toBe(3);
    });

    it('si falla una imagen y otra llega, solo la que falló queda con la genérica', () => {
      spyOn(console, 'error');
      imagenes.getimagen.and.callFake((id: number) =>
        id === 1 ? throwError(() => ({ status: 404 })) : of({ datosBase64: 'BBBB', tipoArchivo: 'image/jpeg' } as any));
      categorias.getCategorias.and.returnValue(of([categoria('A', 1), categoria('B', 2)]));
      crear({ conToken: true });
      const imgs = Array.from(el.querySelectorAll<HTMLImageElement>('.img-container img'));
      expect(imgs[0].src).toContain('deporte.jpg');
      expect(imgs[1].src).toContain('data:image/jpeg;base64,BBBB');
    });
  });
});
