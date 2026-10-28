import { CODIGO_LISTADO_VACIO, interpretarAtenciones } from './atenciones.util';

describe('atenciones.util › interpretarAtenciones (GET /atencionesporclase)', () => {
  const fila = { idPerfil: '1', idClase: 7, estaAtendido: true };

  it('un arreglo válido se devuelve tal cual', () => {
    const lista = [fila, { ...fila, idPerfil: '2', estaAtendido: false }];
    expect(interpretarAtenciones(lista)).toBe(lista);
  });

  it('un arreglo vacío es una lista vacía legítima', () => {
    expect(interpretarAtenciones([])).toEqual([]);
  });

  it('GC-0002 (listado vacío del backend, con HTTP 200) es una lista vacía', () => {
    expect(CODIGO_LISTADO_VACIO).toBe('GC-0002');
    expect(interpretarAtenciones({ codigoError: 'GC-0002', mensaje: 'x', codigoHttp: 200, url: 'u', metodo: 'GET' })).toEqual([]);
  });

  it('otro código de error con HTTP 200 NO es una lista vacía (error de lectura)', () => {
    expect(interpretarAtenciones({ codigoError: 'GC-0099', mensaje: 'x' })).toBeNull();
    expect(interpretarAtenciones({ codigoError: 'GC-0001' })).toBeNull();
  });

  it('valores inesperados NO son una lista vacía: null, undefined, cadena, número, booleano y objeto sin codigoError', () => {
    for (const valor of [null, undefined, '', 'GC-0002', '[]', 0, 7, true, false, {}, { mensaje: 'x' }, { codigoError: null }, { codigoError: 2 }]) {
      expect(interpretarAtenciones(valor)).withContext(JSON.stringify(valor)).toBeNull();
    }
  });

  it('el código se compara de forma exacta (sin espacios ni minúsculas)', () => {
    expect(interpretarAtenciones({ codigoError: 'gc-0002' })).toBeNull();
    expect(interpretarAtenciones({ codigoError: ' GC-0002 ' })).toBeNull();
  });
});
