import { createHmac } from 'node:crypto';
import { Page } from '@playwright/test';

// El backend exige un dpt_token (JWT HS256) en casi todos los endpoints. En producción lo emite POST /auth/token a cambio de un
// token de Google; las pruebas E2E no pueden iniciar sesión con Google, así que firman uno con el MISMO secreto con el que corre
// el backend (JWT_SECRET, Base64). Hay que pasarlo por la variable de entorno E2E_JWT_SECRET:
//   PowerShell:  $env:E2E_JWT_SECRET = "<el mismo valor de JWT_SECRET del backend>"; npm run e2e
// Los roles válidos son los del claim "rol": Coordinador, Instructor, Alumno, Administrador.

const ROL_POR_DEFECTO = 'Coordinador';
// Coordinador semilla del DDL (tbl_coordinador). El backend solo lee el claim, no consulta este id para autorizar.
const PERF_ID_POR_DEFECTO = '1';

function base64url(datos: Buffer | string): string {
  return Buffer.from(datos).toString('base64url');
}

export function crearDptToken(rol: string = ROL_POR_DEFECTO, perfId: string = PERF_ID_POR_DEFECTO): string {
  const secreto = process.env['E2E_JWT_SECRET'];
  if (!secreto) {
    throw new Error(
      'Falta la variable de entorno E2E_JWT_SECRET: debe tener el mismo valor (Base64) de JWT_SECRET con el que corre el backend.'
    );
  }
  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const cuerpo = base64url(JSON.stringify({
    sub: `${perfId}@e2e.unicauca.edu.co`,
    iat: ahora,
    exp: ahora + 3600,
    rol,
    perf_id: perfId,
  }));
  const firma = createHmac('sha256', Buffer.from(secreto, 'base64'))
    .update(`${encabezado}.${cuerpo}`)
    .digest();
  return `${encabezado}.${cuerpo}.${base64url(firma)}`;
}

/** Cabecera para las llamadas directas al backend (page.request / playwright.request). */
export function authHeaders(rol: string = ROL_POR_DEFECTO, perfId: string = PERF_ID_POR_DEFECTO): Record<string, string> {
  return { Authorization: `Bearer ${crearDptToken(rol, perfId)}` };
}

/** Deja en sessionStorage lo mismo que guarda TokenInterchangeService tras iniciar sesión, antes de que cargue la aplicación. */
export async function injectPerfil(
  page: Page,
  rol: string = ROL_POR_DEFECTO,
  perfId: string = PERF_ID_POR_DEFECTO,
): Promise<void> {
  const token = crearDptToken(rol, perfId);
  const perfil = JSON.stringify({
    id: perfId,
    nombre: 'Usuario E2E',
    correo: `${perfId}@e2e.unicauca.edu.co`,
    tipoId: 'CC',
    sexo: 'M',
    role: rol,
  });
  await page.addInitScript(
    ({ token, rol, perfId, perfil }) => {
      sessionStorage.setItem('dpt_token', token);
      sessionStorage.setItem('dpt_role', rol);
      sessionStorage.setItem('dpt_perfil_id', perfId);
      sessionStorage.setItem('dpt_perfil', perfil);
    },
    { token, rol, perfId, perfil },
  );
}
