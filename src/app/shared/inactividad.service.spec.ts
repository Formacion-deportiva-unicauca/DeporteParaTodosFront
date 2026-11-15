import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { InactividadService } from './inactividad.service';
import { AVISO_PREVIO_MS, INACTIVIDAD_MS, INTERVALO_REVISION_MS, LIMITE_MOUSEMOVE_MS } from './inactividad.constantes';
import { EstadoSesionService } from './estado-sesion.service';
import { AVISO_INACTIVIDAD, AVISO_SESION_VENCIDA, SesionVencidaService } from './sesion-vencida.service';
import { NotificacionService } from './notificacion/notificacion.service';
import { PerfilService } from '../services/perfil.service';
import { crearJwtQueVenceEn } from '../testing/jwt-prueba';

const MINUTO = 60 * 1000;
const CLAVES = ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil', 'dpt_bienvenida'];

describe('InactividadService', () => {
  let servicio: InactividadService;
  let estado: EstadoSesionService;
  let sesionVencida: SesionVencidaService;
  let zona: NgZone;
  let router: jasmine.SpyObj<Router>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let avisosPrevios: Array<{ dismiss: jasmine.Spy }>;
  let token: string;

  /** Aviso con acción falso: dismiss() emite afterDismissed(), como el de Material. */
  const crearAviso = () => {
    const cerrado$ = new Subject<void>();
    const aviso = {
      dismiss: jasmine.createSpy('dismiss').and.callFake(() => cerrado$.next()),
      afterDismissed: () => cerrado$.asObservable(),
    };
    avisosPrevios.push(aviso);
    return aviso as any;
  };

  /** Crea el servicio y deja la sesión activa (dentro de fakeAsync, para que sus temporizadores sean falsos). */
  const iniciarSesion = (): void => {
    token = crearJwtQueVenceEn(7200);
    sessionStorage.setItem('dpt_token', token);
    sessionStorage.setItem('dpt_role', 'Alumno');
    servicio = TestBed.inject(InactividadService);
    estado.activa();
  };

  const terminar = (): void => {
    estado.visitante();
    tick();
  };

  const actividad = (tipo: string): void => {
    document.dispatchEvent(new Event(tipo));
  };

  beforeEach(() => {
    CLAVES.forEach(k => sessionStorage.removeItem(k));
    avisosPrevios = [];
    router = jasmine.createSpyObj('Router', ['navigate']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info', 'conAccion']);
    avisos.conAccion.and.callFake(() => crearAviso());
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: NotificacionService, useValue: avisos },
        { provide: PerfilService, useValue: jasmine.createSpyObj('PerfilService', ['setPerfil']) },
        { provide: Location, useValue: { path: () => '/home' } },
      ],
    });
    estado = TestBed.inject(EstadoSesionService);
    sesionVencida = TestBed.inject(SesionVencidaService);
    zona = TestBed.inject(NgZone);
  });

  afterEach(() => CLAVES.forEach(k => sessionStorage.removeItem(k)));

  it('las constantes: 30 minutos de inactividad y aviso 2 minutos antes', () => {
    expect(INACTIVIDAD_MS).toBe(30 * MINUTO);
    expect(AVISO_PREVIO_MS).toBe(2 * MINUTO);
  });

  describe('solo con la sesión activa', () => {
    it('sin sesión (visitante) no corre: ni avisa ni cierra, y no escucha la actividad', fakeAsync(() => {
      servicio = TestBed.inject(InactividadService);
      const registrar = spyOn<any>(servicio, 'registrarActividad');
      tick(2 * 60 * MINUTO);
      actividad('keydown');
      actividad('pointerdown');
      expect(registrar).not.toHaveBeenCalled();
      expect(avisos.conAccion).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('mientras la sesión se está resolviendo (redirect de Google) tampoco corre', fakeAsync(() => {
      servicio = TestBed.inject(InactividadService);
      estado.resolviendo();
      tick(2 * 60 * MINUTO);
      expect(avisos.conAccion).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
    }));

    it('arranca al activarse la sesión', fakeAsync(() => {
      iniciarSesion();
      const registrar = spyOn<any>(servicio, 'registrarActividad');
      actividad('keydown');
      expect(registrar).toHaveBeenCalledTimes(1);
      terminar();
    }));

    it('si la sesión ya estaba activa cuando se crea el servicio, arranca de inmediato', fakeAsync(() => {
      estado.activa();
      token = crearJwtQueVenceEn(7200);
      sessionStorage.setItem('dpt_token', token);
      servicio = TestBed.inject(InactividadService);
      tick(28 * MINUTO);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      terminar();
    }));

    it('se detiene al cerrar sesión: quita el aviso previo y deja de contar y de escuchar', fakeAsync(() => {
      iniciarSesion();
      tick(28 * MINUTO);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);

      estado.visitante(); // lo que hace AuthService.logout()
      expect(avisosPrevios[0].dismiss).toHaveBeenCalledTimes(1);

      const registrar = spyOn<any>(servicio, 'registrarActividad');
      actividad('keydown');
      tick(2 * 60 * MINUTO); // un intervalo vivo haría fallar fakeAsync con "periodic timer(s) still in the queue"
      expect(registrar).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('se detiene si la sesión vence por un 401', fakeAsync(() => {
      iniciarSesion();
      tick(10 * MINUTO);
      sesionVencida.alRecibir401(token);
      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_SESION_VENCIDA.titulo, AVISO_SESION_VENCIDA.mensaje);
      tick(2 * 60 * MINUTO);
      expect(avisos.error).toHaveBeenCalledTimes(1); // no hay un segundo aviso por inactividad
      expect(avisos.conAccion).not.toHaveBeenCalled();
    }));
  });

  describe('cuenta regresiva', () => {
    it('sin actividad: a falta de 2 minutos avisa (una sola vez) y a los 30 cierra la sesión', fakeAsync(() => {
      iniciarSesion();

      tick(INACTIVIDAD_MS - AVISO_PREVIO_MS - INTERVALO_REVISION_MS); // 27 min 45 s
      expect(avisos.conAccion).not.toHaveBeenCalled();

      tick(INTERVALO_REVISION_MS); // 28 min
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      const [tipo, titulo, mensaje, accion] = avisos.conAccion.calls.mostRecent().args;
      expect(tipo).toBe('info');
      expect(titulo).toBe('Tu sesión se cerrará por inactividad');
      expect(mensaje).toContain('2 minutos');
      expect(accion.texto).toBe('Seguir conectado');

      tick(AVISO_PREVIO_MS - INTERVALO_REVISION_MS); // 29 min 45 s: sigue el mismo aviso, no se repite
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      expect(avisos.error).not.toHaveBeenCalled();
      expect(sessionStorage.getItem('dpt_token')).toBe(token);

      tick(INTERVALO_REVISION_MS); // 30 min
      tick();
      expect(avisosPrevios[0].dismiss).toHaveBeenCalled();
      expect(estado.actual).toBe('visitante');
      CLAVES.forEach(k => expect(sessionStorage.getItem(k)).toBeNull(`${k} debe borrarse`));
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_INACTIVIDAD.titulo, AVISO_INACTIVIDAD.mensaje);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('el texto del cierre es "Tu sesión se cerró por inactividad. Inicia sesión de nuevo."', () => {
      expect(`${AVISO_INACTIVIDAD.titulo}. ${AVISO_INACTIVIDAD.mensaje}`).toBe('Tu sesión se cerró por inactividad. Inicia sesión de nuevo.');
    });

    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(tipo => {
      it(`la actividad (${tipo}) reinicia el contador`, fakeAsync(() => {
        iniciarSesion();
        tick(20 * MINUTO);
        actividad(tipo);
        tick(20 * MINUTO); // 40 min en total: sin actividad ya se habría cerrado a los 30
        expect(avisos.error).not.toHaveBeenCalled();
        expect(estado.actual).toBe('activa');
        expect(avisos.conAccion).not.toHaveBeenCalled();
        tick(8 * MINUTO); // 20 + 28 min desde la actividad: ahora sí el aviso previo
        expect(avisos.conAccion).toHaveBeenCalledTimes(1);
        terminar();
      }));
    });

    it('la actividad durante el aviso previo lo quita y reinicia el contador', fakeAsync(() => {
      iniciarSesion();
      tick(28 * MINUTO);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      actividad('pointerdown');
      expect(avisosPrevios[0].dismiss).toHaveBeenCalledTimes(1);
      tick(10 * MINUTO); // 38 min en total: no se cerró
      expect(avisos.error).not.toHaveBeenCalled();
      expect(estado.actual).toBe('activa');
      terminar();
    }));

    it('"Seguir conectado" reinicia el contador y cierra el aviso', fakeAsync(() => {
      iniciarSesion();
      tick(28 * MINUTO);
      const accion = avisos.conAccion.calls.mostRecent().args[3];

      accion.alPulsar();
      expect(avisosPrevios[0].dismiss).toHaveBeenCalledTimes(1);

      tick(2 * MINUTO); // 30 min desde el inicio: sin el botón ya se habría cerrado
      expect(avisos.error).not.toHaveBeenCalled();
      expect(estado.actual).toBe('activa');
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);

      tick(25 * MINUTO); // 55 min: faltan 28 desde que se pulsó (28 + 28 = 56)
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      tick(MINUTO); // 56 min
      expect(avisos.conAccion).toHaveBeenCalledTimes(2);
      terminar();
    }));

    it('si otro aviso reemplaza al aviso previo, vuelve a mostrarse en la siguiente revisión', fakeAsync(() => {
      iniciarSesion();
      tick(28 * MINUTO);
      avisosPrevios[0].dismiss(); // otro aviso lo reemplazó (no lo cerró la persona con el botón)
      tick(INTERVALO_REVISION_MS);
      expect(avisos.conAccion).toHaveBeenCalledTimes(2);
      terminar();
    }));

    it('un nuevo inicio de sesión reinicia el control de "un solo aviso": vuelve a cerrar y avisar', fakeAsync(() => {
      iniciarSesion();
      tick(INACTIVIDAD_MS);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledTimes(1);

      token = crearJwtQueVenceEn(7200);
      sessionStorage.setItem('dpt_token', token);
      estado.activa(); // nuevo inicio de sesión
      tick(INACTIVIDAD_MS);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(2);
      expect(router.navigate).toHaveBeenCalledTimes(2);
    }));
  });

  describe('mousemove limitado a una vez por segundo', () => {
    it('movimientos más seguidos que 1 s no cuentan; pasado el segundo, sí', fakeAsync(() => {
      iniciarSesion();
      const registrar = spyOn<any>(servicio, 'registrarActividad');
      tick(5000);

      actividad('mousemove');
      expect(registrar).toHaveBeenCalledTimes(1);

      tick(LIMITE_MOUSEMOVE_MS / 2);
      actividad('mousemove');
      actividad('mousemove');
      expect(registrar).toHaveBeenCalledTimes(1);

      tick(LIMITE_MOUSEMOVE_MS / 2 + 1);
      actividad('mousemove');
      expect(registrar).toHaveBeenCalledTimes(2);
      terminar();
    }));

    it('los demás eventos cuentan siempre, sin límite', fakeAsync(() => {
      iniciarSesion();
      const registrar = spyOn<any>(servicio, 'registrarActividad');
      actividad('keydown');
      actividad('keydown');
      actividad('pointerdown');
      expect(registrar).toHaveBeenCalledTimes(3);
      terminar();
    }));
  });

  describe('fuera de NgZone', () => {
    it('los listeners corren fuera de la zona de Angular, aunque el evento se dispare dentro de ella', fakeAsync(() => {
      iniciarSesion();
      let dentro: boolean | null = null;
      spyOn<any>(servicio, 'registrarActividad').and.callFake(() => (dentro = NgZone.isInAngularZone()));
      zona.run(() => actividad('keydown'));
      expect(dentro as boolean | null).toBe(false);
      terminar();
    }));

    it('el intervalo de revisión corre fuera de la zona de Angular', fakeAsync(() => {
      iniciarSesion();
      let dentro: boolean | null = null;
      spyOn<any>(servicio, 'revisar').and.callFake(() => (dentro = NgZone.isInAngularZone()));
      tick(INTERVALO_REVISION_MS);
      expect(dentro as boolean | null).toBe(false);
      terminar();
    }));

    it('la actividad y las revisiones sin novedad no disparan detección de cambios', fakeAsync(() => {
      iniciarSesion();
      let inestables = 0;
      const suscripcion = zona.onUnstable.subscribe(() => inestables++);
      actividad('keydown');
      actividad('scroll');
      tick(10 * MINUTO); // muchas revisiones, todavía sin aviso
      expect(inestables).toBe(0);
      suscripcion.unsubscribe();
      terminar();
    }));
  });

  describe('no usa un temporizador largo: compara la hora', () => {
    let relojExtra: number;

    beforeEach(() => {
      relojExtra = 0;
    });

    const usarRelojManipulable = (): void => {
      servicio.ahora = () => Date.now() + relojExtra;
    };

    it('tras un salto grande de reloj (equipo suspendido) cierra en la siguiente revisión', fakeAsync(() => {
      iniciarSesion();
      usarRelojManipulable();
      tick(INTERVALO_REVISION_MS);
      expect(avisos.error).not.toHaveBeenCalled();

      relojExtra = 3 * 60 * MINUTO; // el equipo estuvo suspendido 3 horas
      tick(INTERVALO_REVISION_MS);
      tick();
      expect(estado.actual).toBe('visitante');
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_INACTIVIDAD.titulo, AVISO_INACTIVIDAD.mensaje);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('un salto que deja a menos de 2 minutos del cierre muestra el aviso previo, no cierra', fakeAsync(() => {
      iniciarSesion();
      usarRelojManipulable();
      relojExtra = 29 * MINUTO;
      tick(INTERVALO_REVISION_MS);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
      expect(avisos.error).not.toHaveBeenCalled();
      terminar();
    }));

    describe('al volver la pestaña a visible (visibilitychange)', () => {
      const estadoDeLaPestana = (valor: 'visible' | 'hidden'): void => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => valor });
      };

      afterEach(() => {
        delete (document as any).visibilityState;
      });

      it('revisa de inmediato, sin esperar al intervalo, y cierra la sesión si ya pasó el tiempo', fakeAsync(() => {
        iniciarSesion();
        usarRelojManipulable();
        relojExtra = 3 * 60 * MINUTO;
        estadoDeLaPestana('visible');
        actividad('visibilitychange');
        tick();
        expect(estado.actual).toBe('visitante');
        expect(avisos.error).toHaveBeenCalledTimes(1);
        expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
      }));

      it('volver a la pestaña no cuenta como actividad (no reinicia el contador)', fakeAsync(() => {
        iniciarSesion();
        tick(20 * MINUTO);
        const registrar = spyOn<any>(servicio, 'registrarActividad');
        estadoDeLaPestana('visible');
        actividad('visibilitychange');
        expect(registrar).not.toHaveBeenCalled();
        terminar();
      }));

      it('al ocultarse la pestaña no revisa', fakeAsync(() => {
        iniciarSesion();
        usarRelojManipulable();
        relojExtra = 3 * 60 * MINUTO;
        estadoDeLaPestana('hidden');
        actividad('visibilitychange');
        expect(avisos.error).not.toHaveBeenCalled();
        expect(estado.actual).toBe('activa');
        terminar();
      }));
    });

    it('si el reloj retrocede no cierra la sesión', fakeAsync(() => {
      iniciarSesion();
      usarRelojManipulable();
      relojExtra = -2 * 60 * MINUTO;
      tick(INTERVALO_REVISION_MS);
      expect(avisos.error).not.toHaveBeenCalled();
      expect(estado.actual).toBe('activa');
      terminar();
    }));
  });

  describe('un solo aviso a la vez', () => {
    it('si la sesión se cierra por inactividad, un 401 posterior no avisa de nuevo', fakeAsync(() => {
      iniciarSesion();
      tick(INACTIVIDAD_MS);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);

      sesionVencida.alRecibir401(token);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
    }));

    it('si un 401 cierra la sesión durante el aviso previo, el aviso previo se quita y solo sale el de sesión vencida', fakeAsync(() => {
      iniciarSesion();
      tick(28 * MINUTO);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);

      sesionVencida.alRecibir401(token);
      tick();
      expect(avisosPrevios[0].dismiss).toHaveBeenCalled();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_SESION_VENCIDA.titulo, AVISO_SESION_VENCIDA.mensaje);

      tick(5 * MINUTO);
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(avisos.conAccion).toHaveBeenCalledTimes(1);
    }));
  });
});
