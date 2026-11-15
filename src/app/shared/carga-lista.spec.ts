import { CargaLista } from './carga-lista';

describe('CargaLista', () => {
  let carga: CargaLista;

  beforeEach(() => (carga = new CargaLista()));

  it('al crearse no está cargando, ni cargada, ni con error (no se confunde "vacío" con "cargando")', () => {
    expect([carga.cargando, carga.cargada, carga.error]).toEqual([false, false, false]);
  });

  it('iniciar(): pasa a cargando', () => {
    carga.iniciar();
    expect([carga.cargando, carga.cargada, carga.error]).toEqual([true, false, false]);
  });

  it('terminar(): queda cargada (aunque la lista esté vacía)', () => {
    carga.iniciar();
    carga.terminar();
    expect([carga.cargando, carga.cargada, carga.error]).toEqual([false, true, false]);
  });

  it('fallar(): queda en error y NO cargada, para que no se muestre el estado vacío', () => {
    carga.iniciar();
    carga.fallar();
    expect([carga.cargando, carga.cargada, carga.error]).toEqual([false, false, true]);
  });

  it('recargar después de un error limpia el error', () => {
    carga.iniciar();
    carga.fallar();
    carga.iniciar();
    expect([carga.cargando, carga.cargada, carga.error]).toEqual([true, false, false]);
  });

  it('lleva la cuenta de las imágenes pendientes por clave', () => {
    carga.iniciar();
    carga.esperarImagen('A');
    carga.esperarImagen('B');
    expect(carga.imagenPendiente('A')).toBeTrue();
    carga.imagenLista('A');
    expect(carga.imagenPendiente('A')).toBeFalse();
    expect(carga.imagenPendiente('B')).toBeTrue();
  });

  it('imagenFallida(): solo la primera vez avisa; las siguientes no (un aviso por carga)', () => {
    carga.iniciar();
    carga.esperarImagen('A');
    carga.esperarImagen('B');
    expect(carga.imagenFallida('A')).toBeTrue();
    expect(carga.imagenFallida('B')).toBeFalse();
    expect(carga.imagenPendiente('A')).toBeFalse();
    expect(carga.imagenPendiente('B')).toBeFalse();
  });

  it('una carga nueva vuelve a permitir el aviso de imagen y olvida las pendientes', () => {
    carga.iniciar();
    carga.esperarImagen('A');
    carga.imagenFallida('A');
    carga.esperarImagen('B');
    carga.iniciar();
    expect(carga.imagenPendiente('B')).toBeFalse();
    expect(carga.imagenFallida('C')).toBeTrue();
  });
});
