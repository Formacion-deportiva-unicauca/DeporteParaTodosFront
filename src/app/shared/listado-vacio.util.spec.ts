import { CODIGO_LISTADO_VACIO, interpretarListado } from './listado-vacio.util';
import { ClaseDTO } from '../Models/DTOs/clase-dto';

/** GET /clasesGrupo (y /atencionesporclase) responden 200 con el error GC-0002 cuando no hay registros. */
describe('listado-vacio.util › interpretarListado', () => {
  const clase = { codigo: 50, fecha: '2026-10-15' } as ClaseDTO;

  it('el código es el GC-0002 que implementa el backend (CodigoError.LISTADO_VACIO)', () => {
    expect(CODIGO_LISTADO_VACIO).toBe('GC-0002');
  });

  it('un arreglo válido se devuelve tal cual', () => {
    const lista = [clase];
    expect(interpretarListado<ClaseDTO>(lista)).toBe(lista);
    expect(interpretarListado<ClaseDTO>([])).toEqual([]);
  });

  it('GC-0002 con la forma real del backend es una lista vacía', () => {
    expect(interpretarListado<ClaseDTO>({
      codigoError: 'GC-0002', mensaje: 'El listado a retornar se encuentra vacio, No existen registros', codigoHttp: 200,
      url: 'http://127.0.0.1:8082/api/v2/clasesGrupo', metodo: 'GET',
    })).toEqual([]);
  });

  it('un objeto con otro código (GC-0099, GC-0001) NO es una lista vacía', () => {
    expect(interpretarListado<ClaseDTO>({ codigoError: 'GC-0099', mensaje: 'x' })).toBeNull();
    expect(interpretarListado<ClaseDTO>({ codigoError: 'GC-0001' })).toBeNull();
  });

  it('null, undefined, cadena, número, booleano y objeto sin codigoError NO son una lista vacía', () => {
    for (const valor of [null, undefined, '', 'GC-0002', '[]', 0, 7, true, false, {}, { mensaje: 'x' }, { codigoError: null }, { codigoError: 2 }]) {
      expect(interpretarListado<ClaseDTO>(valor)).withContext(JSON.stringify(valor)).toBeNull();
    }
  });

  it('el código se compara de forma exacta', () => {
    expect(interpretarListado<ClaseDTO>({ codigoError: 'gc-0002' })).toBeNull();
    expect(interpretarListado<ClaseDTO>({ codigoError: ' GC-0002 ' })).toBeNull();
  });
});
