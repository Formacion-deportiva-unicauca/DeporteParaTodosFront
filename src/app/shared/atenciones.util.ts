import { AtencionDTO } from '../Models/DTOs/atencion-dto';
import { interpretarListado } from './listado-vacio.util';

export { CODIGO_LISTADO_VACIO } from './listado-vacio.util';

/** Interpreta el cuerpo de GET /atencionesporclase (ver interpretarListado): lista, GC-0002 = vacía, o null si no se entiende. */
export function interpretarAtenciones(cuerpo: unknown): AtencionDTO[] | null {
  return interpretarListado<AtencionDTO>(cuerpo);
}
