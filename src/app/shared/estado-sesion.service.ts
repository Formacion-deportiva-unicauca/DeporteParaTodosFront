import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vigenciaDelToken } from './token-sesion';

/**
 * - resolviendo: Google acaba de redirigir de vuelta (hay un id_token en la URL) y falta el intercambio con el backend.
 * - activa: hay un dpt_token vigente.
 * - visitante: no hay sesión ni un inicio de sesión en curso.
 */
export type EstadoSesion = 'resolviendo' | 'activa' | 'visitante';

// El flujo implícito de Google devuelve los tokens en el fragmento (#id_token=...&access_token=...).
const REDIRECCION_DE_GOOGLE = /[#&](id_token|access_token)=/;

/** Estado al arrancar la aplicación. Debe calcularse antes de que la librería OAuth limpie el fragmento de la URL. */
export function estadoSesionInicial(): EstadoSesion {
  try {
    // Un token vencido o ilegible no es sesión: SesionVencidaService lo descarta al arrancar.
    if (vigenciaDelToken(sessionStorage.getItem('dpt_token')) === 'vigente') return 'activa';
    if (REDIRECCION_DE_GOOGLE.test(window.location.hash)) return 'resolviendo';
  } catch {
    // Sin acceso al almacenamiento o a la URL: se trata como visitante.
  }
  return 'visitante';
}

/**
 * Dice a las pantallas si la sesión está resuelta, para no enseñar la cabecera de visitante mientras se completa el
 * inicio de sesión. No hace peticiones ni toca el flujo de autenticación: solo refleja lo que ya ocurre en AuthService
 * y TokenInterchangeService.
 */
@Injectable({ providedIn: 'root' })
export class EstadoSesionService {
  private readonly estado = new BehaviorSubject<EstadoSesion>(estadoSesionInicial());
  readonly estado$ = this.estado.asObservable();

  get actual(): EstadoSesion {
    return this.estado.value;
  }

  resolviendo(): void {
    this.estado.next('resolviendo');
  }

  activa(): void {
    this.estado.next('activa');
  }

  visitante(): void {
    this.estado.next('visitante');
  }
}
