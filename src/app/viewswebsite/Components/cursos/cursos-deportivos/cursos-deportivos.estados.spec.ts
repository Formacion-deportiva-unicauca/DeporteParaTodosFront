import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SidenavComponent } from 'src/app/viewswebsite/pages/sidenav/sidenav.component';
import { SidenavStub } from 'src/app/testing/sidenav-stub';
import { CursosDeportivosComponent } from './cursos-deportivos.component';
import { CursodeportivoService } from 'src/app/services/cursodeportivo.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { CategoriaService } from 'src/app/services/categoria.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';

const curso = (nombre: string, idImagen: number | null = null) =>
  ({ nombre, deporte: 'Natación', categoriaCurso: 'Recreativo', descripcion: 'Desc', estadoCurso: 'ACTIVO', estadoInscripciones: 'ABIERTO', publico: 'TODOS', idImagen } as any);

/** Estados de la lista de cursos de una categoría: cargando, vacío, error e imágenes. Igual para todos los roles. */
describe('CursosDeportivosComponent › estados de carga', () => {
  let fixture: ComponentFixture<CursosDeportivosComponent>;
  let el: HTMLElement;
  let cursos: jasmine.SpyObj<CursodeportivoService>;
  let imagenes: jasmine.SpyObj<ImagenService>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil$: BehaviorSubject<string>;

  const texto = (): string => el.textContent ?? '';
  const esqueletos = (forma?: string): number =>
    Array.from(el.querySelectorAll('app-esqueleto')).filter(e => !forma || e.getAttribute('forma') === forma).length;

  const crear = (): void => {
    fixture = TestBed.createComponent(CursosDeportivosComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    cursos = jasmine.createSpyObj('CursodeportivoService', ['getCursos', 'getTodosCursosDeCategoria']);
    cursos.getCursos.and.returnValue(of([]));
    cursos.getTodosCursosDeCategoria.and.returnValue(of([]));
    imagenes = jasmine.createSpyObj('ImagenService', ['getimagen']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil$ = new BehaviorSubject<string>('Alumno');

    await TestBed.configureTestingModule({
      imports: [CursosDeportivosComponent, NoopAnimationsModule],
      providers: [
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: CursodeportivoService, useValue: cursos },
        { provide: PerfilService, useValue: { perfil$: perfil$.asObservable() } },
        { provide: CategoriaService, useValue: { getCategorias: () => of([{ titulo: 'Recreativo', descripcion: 'x' }]) } },
        { provide: ImagenService, useValue: imagenes },
        { provide: MatDialog, useValue: { open: jasmine.createSpy() } },
        { provide: NotificacionService, useValue: avisos },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'Recreativo' } } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(CursosDeportivosComponent, { remove: { imports: [SidenavComponent] }, add: { imports: [SidenavStub] } })
      .compileComponents();
  });

  it('cargando: tarjetas esqueleto, sin el aviso de vacío ni el contador "0 de 0"', () => {
    cursos.getCursos.and.returnValue(new Subject<any[]>());
    crear();
    expect(esqueletos('tarjeta')).toBe(1);
    expect(el.querySelector('.rejilla-cursos')!.getAttribute('aria-busy')).toBe('true');
    expect(texto()).not.toContain('Esta categoría aún no tiene cursos');
    expect(el.querySelector('.contador-visibles')).toBeNull();
  });

  it('cargada con cursos: sin esqueletos, con tarjetas y con el contador', () => {
    cursos.getCursos.and.returnValue(of([curso('Natación'), curso('Yoga')]));
    crear();
    expect(esqueletos()).toBe(0);
    expect(el.querySelectorAll('mat-card.tarjeta-curso').length).toBe(2);
    expect(el.querySelector('.contador-visibles')!.textContent).toContain('2 de 2 cursos visibles');
  });

  it('vacía: "Esta categoría aún no tiene cursos." sin esqueletos', () => {
    cursos.getCursos.and.returnValue(of([]));
    crear();
    expect(texto()).toContain('Esta categoría aún no tiene cursos.');
    expect(esqueletos()).toBe(0);
  });

  it('del esqueleto al vacío: mientras carga no dice que no hay cursos', () => {
    const lista$ = new Subject<any[]>();
    cursos.getCursos.and.returnValue(lista$);
    crear();
    expect(texto()).not.toContain('aún no tiene cursos');
    lista$.next([]);
    fixture.detectChanges();
    expect(texto()).toContain('Esta categoría aún no tiene cursos.');
  });

  it('error: mensaje de alerta y aviso, y no se confunde con "no hay cursos"', () => {
    spyOn(console, 'error');
    cursos.getCursos.and.returnValue(throwError(() => ({ status: 500 })));
    crear();
    expect(el.querySelector('.aviso-error[role="alert"]')?.textContent).toContain('No se pudieron cargar los cursos');
    expect(avisos.error).toHaveBeenCalledOnceWith('No se pudieron cargar los cursos', 'Revise su conexión e intente de nuevo.');
    expect(texto()).not.toContain('aún no tiene cursos');
    expect(esqueletos()).toBe(0);
  });

  it('el Coordinador ve los mismos estados (usa la consulta que incluye los inactivos)', () => {
    perfil$.next('Coordinador');
    cursos.getTodosCursosDeCategoria.and.returnValue(new Subject<any[]>());
    crear();
    expect(cursos.getTodosCursosDeCategoria).toHaveBeenCalledWith('Recreativo');
    expect(esqueletos('tarjeta')).toBe(1);
  });

  it('imagen en camino: esqueleto en la tarjeta hasta que llega', () => {
    const img$ = new Subject<any>();
    imagenes.getimagen.and.returnValue(img$);
    cursos.getCursos.and.returnValue(of([curso('Natación', 5)]));
    crear();
    expect(esqueletos('imagen')).toBe(1);
    img$.next({ datosBase64: 'AAAA', tipoArchivo: 'image/png' });
    fixture.detectChanges();
    expect(esqueletos('imagen')).toBe(0);
    expect(el.querySelector<HTMLImageElement>('.imagen-curso img')!.src).toContain('data:image/png;base64,AAAA');
  });

  it('varias imágenes fallidas: un solo aviso y las tarjetas quedan con la imagen genérica', () => {
    spyOn(console, 'error');
    imagenes.getimagen.and.returnValue(throwError(() => ({ status: 500 })));
    cursos.getCursos.and.returnValue(of([curso('A', 1), curso('B', 2), curso('C', 3)]));
    crear();
    const deImagen = avisos.error.calls.allArgs().filter(a => a[0] === 'No se pudieron cargar algunas imágenes');
    expect(deImagen.length).toBe(1);
    expect(esqueletos('imagen')).toBe(0);
    expect(el.querySelectorAll('.imagen-curso img').length).toBe(3);
  });
});
