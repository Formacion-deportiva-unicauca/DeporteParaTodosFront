import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { HomeComponent } from './home.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { ImagenService } from 'src/app/services/imagen.service';
import { PerfilService } from 'src/app/services/perfil.service';
import { TokenInterchangeService } from 'src/app/services/token-interchange.service';
import { NotificacionService } from 'src/app/shared/notificacion/notificacion.service';
import { InformacionDialogComponent } from '../../Components/dialog/informacion-dialog.component';

/** Resultado de las acciones sobre categorías: el Coordinador debe ver siempre si salió bien o no. */
describe('HomeComponent › avisos al usuario', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;
  let categorias: jasmine.SpyObj<CategoriaService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let notificaciones: jasmine.SpyObj<NotificacionService>;
  let router: jasmine.SpyObj<Router>;

  /** Hace que el diálogo que abre el componente se cierre con el resultado indicado. */
  const cerrarConResultado = (resultado: unknown): void => {
    dialog.open.and.returnValue({ afterClosed: () => of(resultado) } as any);
  };

  beforeEach(async () => {
    sessionStorage.setItem('dpt_token', 'token');
    categorias = jasmine.createSpyObj('CategoriaService', ['getCategorias']);
    categorias.getCategorias.and.returnValue(of([]));
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    notificaciones = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);

    await TestBed.configureTestingModule({
      imports: [HomeComponent, NoopAnimationsModule],
      providers: [
        { provide: CategoriaService, useValue: categorias },
        { provide: ImagenService, useValue: jasmine.createSpyObj('ImagenService', ['getimagen']) },
        { provide: PerfilService, useValue: { perfil$: new BehaviorSubject<string>('Coordinador').asObservable() } },
        { provide: TokenInterchangeService, useValue: { tokenReady$: new Subject<void>().asObservable() } },
        { provide: Router, useValue: router = jasmine.createSpyObj('Router', ['navigate']) },
        { provide: MatDialog, useValue: dialog },
        { provide: NotificacionService, useValue: notificaciones },
      ],
    })
      .overrideComponent(HomeComponent, {
        set: { imports: [], template: '<div></div>' },
      })
      .compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    categorias.getCategorias.calls.reset();
  });

  afterEach(() => sessionStorage.removeItem('dpt_token'));

  describe('crear categoría', () => {
    it('si se creó, muestra la notificación de éxito y actualiza la lista una sola vez', () => {
      cerrarConResultado(true);
      component.nuevaCategoria();
      expect(notificaciones.exito).toHaveBeenCalledOnceWith(
        'Categoría creada', 'La categoría se registró y ya aparece en el panel.');
      expect(categorias.getCategorias).toHaveBeenCalledTimes(1);
    });

    it('si el Coordinador cancela, no muestra ningún aviso ni recarga la lista', () => {
      cerrarConResultado(undefined);
      component.nuevaCategoria();
      expect(notificaciones.exito).not.toHaveBeenCalled();
      expect(notificaciones.error).not.toHaveBeenCalled();
      expect(categorias.getCategorias).not.toHaveBeenCalled();
    });
  });

  describe('actualizar categoría', () => {
    it('si se guardaron los cambios, avisa y actualiza la lista', () => {
      cerrarConResultado(true);
      component.onUpdate('Recreativo');
      expect(notificaciones.exito).toHaveBeenCalledOnceWith(
        'Categoría actualizada', 'Los cambios de «Recreativo» se guardaron correctamente.');
      expect(categorias.getCategorias).toHaveBeenCalledTimes(1);
    });

    it('si cancela, no avisa', () => {
      cerrarConResultado(false);
      component.onUpdate('Recreativo');
      expect(notificaciones.exito).not.toHaveBeenCalled();
    });
  });

  describe('eliminar categoría', () => {
    it('si se eliminó, avisa con el nombre de la categoría y actualiza la lista', () => {
      cerrarConResultado({ confirmado: true });
      component.onDelete('Recreativo');
      expect(notificaciones.exito).toHaveBeenCalledOnceWith(
        'Categoría eliminada', '«Recreativo» ya no aparece en el panel.');
      expect(categorias.getCategorias).toHaveBeenCalledTimes(1);
    });

    it('si el servidor rechaza la eliminación (409), avisa con la notificación de error', () => {
      cerrarConResultado({ errorStatus: 409 });
      component.onDelete('Recreativo');
      expect(notificaciones.exito).not.toHaveBeenCalled();
      expect(notificaciones.error).toHaveBeenCalledOnceWith('No se pudo eliminar la categoría', 'La categoría ya se encuentra eliminada.');
    });

    it('404 y otros errores también usan la notificación de error, con su propio motivo', () => {
      cerrarConResultado({ errorStatus: 404 });
      component.onDelete('Recreativo');
      expect(notificaciones.error).toHaveBeenCalledWith('No se pudo eliminar la categoría', 'La categoría no existe.');
      cerrarConResultado({ errorStatus: 500 });
      component.onDelete('Recreativo');
      expect(notificaciones.error).toHaveBeenCalledWith('No se pudo eliminar la categoría', 'Ocurrió un error, intente de nuevo.');
    });
  });

  describe('ver información de una categoría', () => {
    const categoria = { titulo: 'Recreativo', descripcion: 'Actividades lúdicas.', imagenBase64: 'AAAA', tipoArchivo: 'image/png' } as any;

    it('abre un diálogo de Material (centrado y responsive), no el modal de Bootstrap', () => {
      cerrarConResultado(undefined);
      component.verInformacion(categoria);
      expect(dialog.open).toHaveBeenCalledTimes(1);
      expect(dialog.open.calls.mostRecent().args[0]).toBe(InformacionDialogComponent);
    });

    it('le pasa el nombre, la descripción y la imagen de la categoría', () => {
      cerrarConResultado(undefined);
      component.verInformacion(categoria);
      const config = dialog.open.calls.mostRecent().args[1] as any;
      expect(config.data).toEqual(jasmine.objectContaining({
        etiqueta: 'Categoría deportiva', titulo: 'Recreativo', descripcion: 'Actividades lúdicas.',
        imagen: 'data:image/png;base64,AAAA', textoAccion: 'Ver cursos' }));
    });

    it('sin imagen cargada no envía imagen', () => {
      cerrarConResultado(undefined);
      component.verInformacion({ titulo: 'Recreativo', descripcion: 'x' } as any);
      expect((dialog.open.calls.mostRecent().args[1] as any).data.imagen).toBeNull();
    });

    it('si el usuario elige "Ver cursos", navega a los cursos de esa categoría', () => {
      cerrarConResultado('accion');
      component.verInformacion(categoria);
      expect(router.navigate).toHaveBeenCalledWith(['/cursos_deportivos', 'Recreativo']);
    });

    it('si solo cierra el diálogo, no navega', () => {
      cerrarConResultado(undefined);
      component.verInformacion(categoria);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
