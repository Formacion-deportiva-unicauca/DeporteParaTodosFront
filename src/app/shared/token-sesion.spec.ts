import { MARGEN_VIGENCIA_MS, expiracionDelToken, vigenciaDelToken } from './token-sesion';
import { crearJwt, crearJwtQueVenceEn } from '../testing/jwt-prueba';

describe('token-sesion', () => {
  const AHORA = Date.UTC(2026, 10, 15, 12, 0, 0);

  describe('expiracionDelToken()', () => {
    it('lee el exp (en segundos) del payload', () => {
      expect(expiracionDelToken(crearJwt({ exp: 1800000000 }))).toBe(1800000000);
    });

    it('decodifica base64url con los caracteres - y _ y con texto no ASCII', () => {
      // "ñ>>?" y "¿" producen + y / en base64 estándar, que base64url cambia por - y _.
      const token = crearJwt({ nombre: 'ñ>>?¿áéíóú', exp: 1800000000 });
      expect(token.split('.')[1]).toMatch(/[-_]/);
      expect(expiracionDelToken(token)).toBe(1800000000);
    });

    it('sin relleno "=" (base64url) también funciona', () => {
      const token = crearJwt({ exp: 1800000000, x: 'a' });
      expect(token.split('.')[1]).not.toContain('=');
      expect(expiracionDelToken(token)).toBe(1800000000);
    });

    it('nulo, vacío o sin tres partes: null', () => {
      expect(expiracionDelToken(null)).toBeNull();
      expect(expiracionDelToken(undefined)).toBeNull();
      expect(expiracionDelToken('')).toBeNull();
      expect(expiracionDelToken('abc')).toBeNull();
      expect(expiracionDelToken('a.b')).toBeNull();
      expect(expiracionDelToken('a.b.c.d')).toBeNull();
    });

    it('payload que no es base64 válido: null, sin lanzar', () => {
      expect(expiracionDelToken('aaa.%%%%.ccc')).toBeNull();
      expect(expiracionDelToken('aaa.abcde.ccc')).toBeNull(); // longitud 5: imposible en base64
    });

    it('payload que no es JSON: null', () => {
      const noJson = btoa('esto no es json').replace(/=+$/, '');
      expect(expiracionDelToken(`aaa.${noJson}.ccc`)).toBeNull();
    });

    it('payload sin exp, con exp de texto o con exp no finito: null', () => {
      expect(expiracionDelToken(crearJwt({ sub: 'x' }))).toBeNull();
      expect(expiracionDelToken(crearJwt({ exp: '1800000000' }))).toBeNull();
      expect(expiracionDelToken(crearJwt({ exp: null }))).toBeNull();
    });

    it('payload JSON que no es un objeto (null, número): null', () => {
      const nulo = btoa('null').replace(/=+$/, '');
      const numero = btoa('42').replace(/=+$/, '');
      expect(expiracionDelToken(`aaa.${nulo}.ccc`)).toBeNull();
      expect(expiracionDelToken(`aaa.${numero}.ccc`)).toBeNull();
    });

    it('bytes que no son UTF-8 válido: null', () => {
      const raro = btoa(String.fromCharCode(0xff, 0xfe, 0xfd)).replace(/=+$/, '');
      expect(expiracionDelToken(`aaa.${raro}.ccc`)).toBeNull();
    });
  });

  describe('vigenciaDelToken()', () => {
    it('vence dentro de una hora: vigente', () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(3600, AHORA), AHORA)).toBe('vigente');
    });

    it('ya venció: vencido', () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(-1, AHORA), AHORA)).toBe('vencido');
      expect(vigenciaDelToken(crearJwtQueVenceEn(-86400, AHORA), AHORA)).toBe('vencido');
    });

    it(`el margen de ${MARGEN_VIGENCIA_MS / 1000} s: si vence en menos que eso ya cuenta como vencido`, () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(20, AHORA), AHORA)).toBe('vencido');
      expect(vigenciaDelToken(crearJwtQueVenceEn(29, AHORA), AHORA)).toBe('vencido');
      expect(vigenciaDelToken(crearJwtQueVenceEn(31, AHORA), AHORA)).toBe('vigente');
    });

    it('justo en el margen (30 s) cuenta como vencido', () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(30, AHORA), AHORA)).toBe('vencido');
    });

    it('el margen se puede cambiar', () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(20, AHORA), AHORA, 0)).toBe('vigente');
    });

    it('token ilegible o sin exp: inválido', () => {
      expect(vigenciaDelToken('no-es-un-jwt', AHORA)).toBe('invalido');
      expect(vigenciaDelToken(crearJwt({ sub: 'x' }), AHORA)).toBe('invalido');
      expect(vigenciaDelToken(null, AHORA)).toBe('invalido');
    });

    it('sin indicar la hora usa la del navegador', () => {
      expect(vigenciaDelToken(crearJwtQueVenceEn(3600))).toBe('vigente');
      expect(vigenciaDelToken(crearJwtQueVenceEn(-3600))).toBe('vencido');
    });
  });
});
