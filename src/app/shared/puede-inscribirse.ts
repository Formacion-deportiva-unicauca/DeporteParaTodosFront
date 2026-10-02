import { CursoDTO } from '../Models/DTOs/curso-dto';

export function puedeInscribirse(
  curso: CursoDTO | null | undefined,
  categoria: string | null | undefined
): boolean {
  if (categoria?.toLowerCase() === 'seleccionado') return false;
  return curso?.estadoCurso === 'ACTIVO' && curso?.estadoInscripciones === 'ABIERTO';
}
