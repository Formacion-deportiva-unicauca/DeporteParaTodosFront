import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AVISO_INACTIVIDAD, AVISO_SESION_VENCIDA, SesionVencidaService } from './sesion-vencida.service';
import { EstadoSesionService } from './estado-sesion.service';
import { NotificacionService } from './notificacion/notificacion.service';
import { PerfilService } from '../services/perfil.service';
import { crearJwt, crearJwtQueVenceEn } from '../testing/jwt-prueba';

const CLAVES = ['dpt_token', 'dpt_role', 'dpt_perfil_id', 'dpt_perfil', 'dpt_bienvenida'];

describe('SesionVencidaService', () => {
  let servicio: SesionVencidaService;
  let estado: EstadoSesionService;
  let router: jasmine.SpyObj<Router>;
  let avisos: jasmine.SpyObj<NotificacionService>;
  let perfil: jasmine.SpyObj<PerfilService>;
  /** Ruta que el navegador tiene al arrancar (lo que devuelve Location.path()). */
  let ruta: string;

  const guardarSesion = (token: string): void => {
    sessionStorage.setItem('dpt_token', token);
    sessionStorage.setItem('dpt_role', 'Alumno');
    sessionStorage.setItem('dpt_perfil_id', '123');
    sessionStorage.setItem('dpt_perfil', '{"id":123}');
    sessionStorage.setItem('dpt_bienvenida', '1');
  };

  const crear = (): void => {
    estado = TestBed.inject(EstadoSesionService);
    servicio = TestBed.inject(SesionVencidaService);
  };

  beforeEach(() => {
    CLAVES.forEach(k => sessionStorage.removeItem(k));
    router = jasmine.createSpyObj('Router', ['navigate']);
    avisos = jasmine.createSpyObj('NotificacionService', ['exito', 'error', 'info']);
    perfil = jasmine.createSpyObj('PerfilService', ['setPerfil']);
    ruta = '/home';
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: NotificacionService, useValue: avisos },
        { provide: PerfilService, useValue: perfil },
        { provide: Location, useValue: { path: () => ruta } },
      ],
    });
  });

  afterEach(() => {
    CLAVES.forEach(k => sessionStorage.removeItem(k));
    history.replaceState(null, '', window.location.pathname + window.location.search);
  });

  describe('alRecibir401()', () => {
    it('limpia la sesión, avisa y navega al login', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      estado.activa();

      servicio.alRecibir401(token);
      CLAVES.forEach(k => expect(sessionStorage.getItem(k)).toBeNull(`${k} debe borrarse`));
      expect(perfil.setPerfil).toHaveBeenCalledOnceWith('');
      expect(estado.actual).toBe('visitante');

      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_SESION_VENCIDA.titulo, AVISO_SESION_VENCIDA.mensaje);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('el texto del aviso es "Tu sesión venció. Inicia sesión de nuevo."', () => {
      expect(`${AVISO_SESION_VENCIDA.titulo}. ${AVISO_SESION_VENCIDA.mensaje}`).toBe('Tu sesión venció. Inicia sesión de nuevo.');
    });

    it('el aviso y la navegación salen después de la respuesta (no los tapa el error de la pantalla)', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      servicio.alRecibir401(token);
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
    }));

    it('varias respuestas 401 seguidas: un solo aviso y una sola navegación', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      servicio.alRecibir401(token);
      servicio.alRecibir401(token);
      servicio.alRecibir401(token);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledTimes(1);
    }));

    it('si el token ya no es el de la sesión actual (ya limpiada), la respuesta se ignora', fakeAsync(() => {
      crear();
      servicio.alRecibir401('token-de-una-sesion-anterior');
      tick();
      expect(avisos.error).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('un nuevo inicio de sesión reinicia el control: el siguiente vencimiento vuelve a avisar', fakeAsync(() => {
      const primero = crearJwtQueVenceEn(3600);
      guardarSesion(primero);
      crear();
      servicio.alRecibir401(primero);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);

      const segundo = crearJwtQueVenceEn(7200);
      guardarSesion(segundo);
      estado.activa(); // lo que hace TokenInterchangeService al terminar un inicio de sesión
      servicio.alRecibir401(segundo);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(2);
      expect(router.navigate).toHaveBeenCalledTimes(2);
    }));
  });

  describe('cerrarPorInactividad()', () => {
    it('limpia la sesión, avisa "Tu sesión se cerró por inactividad" y navega al login', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(3600));
      crear();
      estado.activa();
      servicio.cerrarPorInactividad();
      CLAVES.forEach(k => expect(sessionStorage.getItem(k)).toBeNull(`${k} debe borrarse`));
      expect(perfil.setPerfil).toHaveBeenCalledOnceWith('');
      expect(estado.actual).toBe('visitante');
      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_INACTIVIDAD.titulo, AVISO_INACTIVIDAD.mensaje);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('comparte el control de "un solo aviso" con el 401: no salen los dos', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      servicio.alRecibir401(token);
      servicio.cerrarPorInactividad();
      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_SESION_VENCIDA.titulo, AVISO_SESION_VENCIDA.mensaje);
      expect(router.navigate).toHaveBeenCalledTimes(1);
    }));

    it('y al revés: si cerró por inactividad, un 401 posterior no avisa', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      servicio.cerrarPorInactividad();
      servicio.alRecibir401(token);
      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_INACTIVIDAD.titulo, AVISO_INACTIVIDAD.mensaje);
    }));

    it('con un nuevo inicio de sesión se reinicia el control', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(3600));
      crear();
      servicio.cerrarPorInactividad();
      tick();
      guardarSesion(crearJwtQueVenceEn(7200));
      estado.activa();
      servicio.cerrarPorInactividad();
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(2);
    }));
  });

  describe('revisarAlArrancar()', () => {
    it('token vencido: limpia la sesión, arranca como visitante, avisa una vez y navega al login', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      crear();
      servicio.revisarAlArrancar();
      CLAVES.forEach(k => expect(sessionStorage.getItem(k)).toBeNull(`${k} debe borrarse`));
      expect(perfil.setPerfil).toHaveBeenCalledWith('');
      expect(estado.actual).toBe('visitante');
      tick();
      expect(avisos.error).toHaveBeenCalledOnceWith(AVISO_SESION_VENCIDA.titulo, AVISO_SESION_VENCIDA.mensaje);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('token que vence dentro del margen de 30 s: cuenta como vencido y navega al login', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(10));
      crear();
      servicio.revisarAlArrancar();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('token malformado: se descarta igual, con el mismo aviso y yendo al login', fakeAsync(() => {
      guardarSesion('esto-no-es-un-jwt');
      crear();
      servicio.revisarAlArrancar();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('token sin exp: se trata como ilegible y se descarta', fakeAsync(() => {
      guardarSesion(crearJwt({ sub: 'x' }));
      crear();
      servicio.revisarAlArrancar();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('ya se está en el login: limpia y avisa, pero no navega', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      ruta = '/login';
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('ya se está en el login con parámetros en la URL: tampoco navega', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      ruta = '/login?x=1';
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('una ruta que solo empieza parecido a /login (p. ej. /login-ayuda) sí navega', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      ruta = '/login-ayuda';
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    }));

    it('redirect de Google en curso (id_token en la URL): limpia y avisa, no navega y sigue "resolviendo"', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      history.replaceState(null, '', '#id_token=abc&state=1');
      crear();
      expect(estado.actual).toBe('resolviendo');
      servicio.revisarAlArrancar();
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBeNull();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(estado.actual).toBe('resolviendo');
    }));

    it('visitante sin token: no navega, no avisa y no toca nada', fakeAsync(() => {
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
      expect(perfil.setPerfil).not.toHaveBeenCalled();
    }));

    it('token vigente: no navega', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(3600));
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(router.navigate).not.toHaveBeenCalled();
    }));

    it('un solo aviso aunque además llegue un 401 después del arranque', fakeAsync(() => {
      const viejo = crearJwtQueVenceEn(-3600);
      guardarSesion(viejo);
      crear();
      servicio.revisarAlArrancar();
      servicio.alRecibir401(viejo);
      tick();
      expect(avisos.error).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledTimes(1);
    }));

    it('token vigente: conserva la sesión completa, sin aviso', fakeAsync(() => {
      const token = crearJwtQueVenceEn(3600);
      guardarSesion(token);
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(sessionStorage.getItem('dpt_token')).toBe(token);
      expect(sessionStorage.getItem('dpt_role')).toBe('Alumno');
      expect(perfil.setPerfil).not.toHaveBeenCalled();
      expect(avisos.error).not.toHaveBeenCalled();
    }));

    it('visitante sin token: no hace nada ni avisa', fakeAsync(() => {
      crear();
      servicio.revisarAlArrancar();
      tick();
      expect(avisos.error).not.toHaveBeenCalled();
      expect(perfil.setPerfil).not.toHaveBeenCalled();
    }));

    it('si Google acaba de redirigir (resolviendo), no se pasa a visitante aunque haya un token viejo', fakeAsync(() => {
      guardarSesion(crearJwtQueVenceEn(-3600));
      crear();
      estado.resolviendo();
      servicio.revisarAlArrancar();
      expect(estado.actual).toBe('resolviendo');
      tick();
    }));
  });
});
