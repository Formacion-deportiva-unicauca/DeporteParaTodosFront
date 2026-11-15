import { EstadoSesionService, estadoSesionInicial } from './estado-sesion.service';

describe('EstadoSesionService', () => {
  const limpiarUrl = (): void => history.replaceState(null, '', window.location.pathname + window.location.search);

  beforeEach(() => {
    sessionStorage.removeItem('dpt_token');
    limpiarUrl();
  });

  afterEach(() => {
    sessionStorage.removeItem('dpt_token');
    limpiarUrl();
  });

  describe('estadoSesionInicial()', () => {
    it('sin token y sin redirección de Google: visitante', () => {
      expect(estadoSesionInicial()).toBe('visitante');
    });

    it('con dpt_token: sesión activa', () => {
      sessionStorage.setItem('dpt_token', 'x');
      expect(estadoSesionInicial()).toBe('activa');
    });

    it('Google acaba de redirigir con un id_token en la URL: resolviendo', () => {
      history.replaceState(null, '', '#id_token=abc&state=1');
      expect(estadoSesionInicial()).toBe('resolviendo');
    });

    it('Google redirigió con access_token: resolviendo', () => {
      history.replaceState(null, '', '#access_token=abc&token_type=Bearer');
      expect(estadoSesionInicial()).toBe('resolviendo');
    });

    it('un fragmento cualquiera de la URL no cuenta como inicio de sesión', () => {
      history.replaceState(null, '', '#seccion-1');
      expect(estadoSesionInicial()).toBe('visitante');
    });

    it('si ya hay dpt_token gana sobre la redirección (la sesión ya está resuelta)', () => {
      sessionStorage.setItem('dpt_token', 'x');
      history.replaceState(null, '', '#id_token=abc');
      expect(estadoSesionInicial()).toBe('activa');
    });
  });

  describe('transiciones', () => {
    it('emite cada cambio de estado y "actual" lo refleja', () => {
      const servicio = new EstadoSesionService();
      const vistos: string[] = [];
      servicio.estado$.subscribe(e => vistos.push(e));
      servicio.resolviendo();
      servicio.activa();
      servicio.visitante();
      expect(vistos).toEqual(['visitante', 'resolviendo', 'activa', 'visitante']);
      expect(servicio.actual).toBe('visitante');
    });
  });
});
