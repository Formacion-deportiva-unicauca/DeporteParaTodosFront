import { test, expect, APIRequestContext } from '@playwright/test';
import { authHeaders, injectPerfil } from '../support/auth-setup';
import { TEST_GROUP, API_BASE } from '../support/test-data';

// SCRUM-66: editar datos de un alumno y eliminar/desvincular otro desde listaDeportistasCurso.
//
// Estrategia de idempotencia:
//   Test 05-A (editar): escribe 'Nombre Editado Playwright' → idempotente si el nombre
//     ya era ese en runs anteriores; la actualización siempre devuelve 200.
//
//   Test 05-B (desvincular): destruiría al alumno permanentemente, rompiendo el segundo run.
//     Fix: beforeAll obtiene dinámicamente el último alumno del grupo y lo reserva;
//          afterAll lo re-inscribe con POST /inscripcion para que el siguiente run encuentre ≥2 alumnos.
test.describe('SCRUM-66 — Editar y eliminar alumno del grupo', () => {
  let apiContext: APIRequestContext;
  let alumnoParaDesvincular: { id: number; nombre: string };

  test.beforeAll(async ({ playwright }) => {
    const { categoria, curso, anio, iterable } = TEST_GROUP;
    // Sin baseURL: se usan URLs absolutas completas para evitar que el /api/v2
    // sea descartado por la resolución estándar de URLs con paths que inician en '/'
    apiContext = await playwright.request.newContext({ extraHTTPHeaders: authHeaders() });

    // Obtener la lista actual de alumnos del grupo
    const res = await apiContext.get(
      `${API_BASE}/alumnosGrupo?categoria=${encodeURIComponent(categoria)}&curso=${encodeURIComponent(curso)}&anio=${anio}&iterable=${iterable}`
    );
    if (!res.ok()) throw new Error(`GET /alumnosGrupo falló: ${res.status()}`);

    const alumnos: any[] = await res.json();
    if (!Array.isArray(alumnos) || alumnos.length < 2) {
      throw new Error(`El grupo necesita ≥2 alumnos para este test; encontrados: ${alumnos.length}`);
    }

    // Reservar el último alumno para el test de desvincular
    const ultimo = alumnos[alumnos.length - 1];
    alumnoParaDesvincular = { id: ultimo.id, nombre: ultimo.nombre };
  });

  test.afterAll(async () => {
    // Re-inscribir al alumno desvinculado para que el próximo run CI encuentre ≥2 alumnos
    if (alumnoParaDesvincular) {
      const { categoria, curso, anio, iterable } = TEST_GROUP;
      const hoy = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
      await apiContext.post(`${API_BASE}/inscripcion`, {
        data: {
          fechaInscripcion: hoy,
          fechaDesvinculacion: '',
          alumnoId: String(alumnoParaDesvincular.id),
          categoria,
          curso,
          anio,
          iterable,
          eliminado: 0,
        },
      });
    }
    await apiContext?.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await injectPerfil(page);
  });

  test('edita el nombre de un alumno y se actualiza en la tabla', async ({ page }) => {
    const { categoria, curso, anio, iterable } = TEST_GROUP;
    await page.goto(
      `/listaDeportistasCurso/${encodeURIComponent(categoria)}/${encodeURIComponent(curso)}/${anio}/${iterable}`
    );

    await expect(page.locator('table[mat-table]')).toBeVisible({ timeout: 10_000 });
    // nth(1) = DIANA LAZO (segunda fila); nth(0) = Daniel Tucanes (perfil personal, no tocar)
    const filaEditar = page.locator('tr[mat-row]').nth(1);
    await expect(filaEditar).toBeVisible();

    // Click en editar (ícono "edit") en la fila de DIANA LAZO
    const btnEditar = filaEditar.locator('button').filter({
      has: page.locator('mat-icon', { hasText: 'edit' }),
    });
    await btnEditar.click();

    await expect(page.locator('mat-dialog-content')).toBeVisible();
    await expect(page.locator('mat-dialog-content header')).toContainText('Editar usuario');

    const inputNombre = page.locator('input[name="nombre"]');
    await inputNombre.clear();
    await inputNombre.fill('Nombre Editado Playwright');

    await page.locator('button.aceptar').click();

    await expect(page.locator('mat-dialog-content')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('mat-snack-bar-container')).toContainText(
      'Datos del deportista actualizados',
      { timeout: 8_000 }
    );
    // cargarDatos() re-fetches → nombre actualizado visible en la tabla
    await expect(filaEditar.locator('td').nth(1)).toContainText(
      'Nombre Editado Playwright',
      { timeout: 8_000 }
    );
  });

  test('desvincula el alumno reservado; afterAll lo re-inscribe para el siguiente run', async ({ page }) => {
    const { categoria, curso, anio, iterable } = TEST_GROUP;
    await page.goto(
      `/listaDeportistasCurso/${encodeURIComponent(categoria)}/${encodeURIComponent(curso)}/${anio}/${iterable}`
    );

    await expect(page.locator('table[mat-table]')).toBeVisible({ timeout: 10_000 });

    // Localizar la fila del alumno reservado en beforeAll (por nombre)
    const filaAlumno = page.locator('tr[mat-row]').filter({
      has: page.locator('td', { hasText: alumnoParaDesvincular.nombre }),
    });
    await expect(filaAlumno).toBeVisible();

    // Click en eliminar (ícono "delete")
    const btnEliminar = filaAlumno.locator('button').filter({
      has: page.locator('mat-icon', { hasText: 'delete' }),
    });
    await btnEliminar.click();

    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await expect(page.locator('mat-dialog-container')).toContainText('Confirmar para eliminar');
    await page.locator('button.btn-confirmar').click();

    await expect(page.locator('mat-dialog-container')).not.toBeVisible({ timeout: 8_000 });
    await expect(page.locator('mat-snack-bar-container')).toContainText(
      'Deportista desvinculado del grupo',
      { timeout: 8_000 }
    );

    // El alumno desaparece de la tabla (cargarDatos() re-fetches)
    await expect(filaAlumno).not.toBeVisible({ timeout: 8_000 });
  });
});
