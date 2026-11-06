import { CursosDeportivosComponent } from './cursos-deportivos.component';
import { InformacionDialogComponent } from '../../dialog/informacion-dialog.component';
import { CursoDTO } from 'src/app/Models/DTOs/curso-dto';

/**
 * "Ver información" de un curso. Se instancia el prototipo sin Angular DI porque verInformacion() solo usa
 * el diálogo y el router (mismo enfoque que form-horario.component.spec.ts).
 */
describe('CursosDeportivosComponent › ver información del curso', () => {
  let comp: CursosDeportivosComponent;
  let dialog: { open: jasmine.Spy };
  let router: { navigate: jasmine.Spy };
  let cierre: unknown;

  const curso = {
    nombre: 'Tenis de mesa', categoriaCurso: 'Recreativo', descripcion: 'Curso de iniciación.',
    publico: 'ESTUDIANTE', imagenBase64: 'AAAA', tipoArchivo: 'image/png',
  } as unknown as CursoDTO;

  beforeEach(() => {
    comp = Object.create(CursosDeportivosComponent.prototype) as CursosDeportivosComponent;
    cierre = undefined;
    dialog = {
      open: jasmine.createSpy('open').and.callFake(() => ({
        afterClosed: () => ({ subscribe: (f: (r: unknown) => void) => f(cierre) }),
      })),
    };
    router = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };
    (comp as any).dialog = dialog;
    (comp as any).router = router;
  });

  it('abre un diálogo de Material, no el modal de Bootstrap', () => {
    comp.verInformacion(curso);
    expect(dialog.open.calls.mostRecent().args[0]).toBe(InformacionDialogComponent);
  });

  it('muestra nombre, descripción, imagen, categoría y a quién va dirigido', () => {
    comp.verInformacion(curso);
    const datos = dialog.open.calls.mostRecent().args[1].data;
    expect(datos.etiqueta).toBe('Curso deportivo');
    expect(datos.titulo).toBe('Tenis de mesa');
    expect(datos.descripcion).toBe('Curso de iniciación.');
    expect(datos.imagen).toBe('data:image/png;base64,AAAA');
    expect(datos.datos).toEqual([
      { rotulo: 'Categoría', valor: 'Recreativo' },
      { rotulo: 'Dirigido a', valor: 'Estudiantes' },
    ]);
    expect(datos.textoAccion).toBe('Ver grupos');
  });

  it('ya no muestra "Horario: Por definir": el horario se define en cada grupo', () => {
    comp.verInformacion(curso);
    const rotulos = dialog.open.calls.mostRecent().args[1].data.datos.map((d: { rotulo: string }) => d.rotulo);
    expect(rotulos).not.toContain('Horario');
  });

  it('si el usuario elige "Ver grupos", navega a los grupos del curso', () => {
    cierre = 'accion';
    comp.verInformacion(curso);
    expect(router.navigate).toHaveBeenCalledWith(['/list-grupos', 'Recreativo', 'Tenis de mesa']);
  });

  it('si solo cierra el diálogo, no navega', () => {
    comp.verInformacion(curso);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
