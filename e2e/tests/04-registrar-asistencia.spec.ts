import { test, expect } from '@playwright/test';
import { injectPerfil } from '../support/auth-setup';
import { TEST_GROUP } from '../support/test-data';

// SCRUM-10 HU-02: registrar asistencia desde listaDeportistasCurso.
// El grupo Recreativo/ping pong/2026/1 tiene al menos 2 alumnos reales
// (Diana Lazo, Brayan Ferreira) validados manualmente.
//
// Comportamiento actual de la pantalla (cambió desde la primera versión de esta prueba):
//  - El botón "Registrar asistencia" está SIEMPRE habilitado; las validaciones se hacen al hacer clic.
//  - Al registrar se crea la clase de hoy y se confirma la asistencia; quien no se marca queda con falta.
//  - Una vez registrada, la sesión de hoy queda bloqueada (botón y casillas deshabilitados) y se muestra el aviso
//    #aviso-registrada. Por eso esta prueba solo puede ejecutarse UNA vez por grupo y día.
//  - Si hoy el grupo no tiene horario, el Coordinador debe indicar justificación y duración antes de registrar.
test.describe('SCRUM-10 HU-02 — Registrar asistencia', () => {
  test.beforeEach(async ({ page }) => {
    await injectPerfil(page);
  });

  test('marca alumnos y registra la asistencia de hoy; la sesión queda bloqueada con su aviso', async ({ page }) => {
    const { categoria, curso, anio, iterable } = TEST_GROUP;
    await page.goto(
      `/listaDeportistasCurso/${encodeURIComponent(categoria)}/${encodeURIComponent(curso)}/${anio}/${iterable}`
    );

    // Esperar tabla de alumnos
    await expect(page.locator('table[mat-table]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr[mat-row]').first()).toBeVisible();

    // Si hoy ya se registró la asistencia de este grupo, la pantalla está bloqueada y no hay nada que registrar.
    const avisoRegistrada = page.locator('#aviso-registrada');
    test.skip(
      await avisoRegistrada.isVisible(),
      'La asistencia de hoy ya está registrada en este grupo: esta prueba solo corre una vez por grupo y día.'
    );

    // El botón está habilitado aunque no haya selección (la validación ocurre al hacer clic).
    const btnAsistencia = page.getByRole('button', { name: 'Registrar asistencia' });
    await expect(btnAsistencia).toBeEnabled();

    // Marcar primera y segunda fila
    const checkboxUno = page.locator('tr[mat-row]').nth(0).locator('mat-checkbox input[type="checkbox"]');
    const checkboxDos = page.locator('tr[mat-row]').nth(1).locator('mat-checkbox input[type="checkbox"]');
    await checkboxUno.check({ force: true }); // force: mat-checkbox oculta el input nativo
    await checkboxDos.check({ force: true });

    // Registrar. Si hoy el grupo no tiene horario aparece la sección "fuera de horario" (a veces solo tras el primer
    // intento): se completa justificación y duración y se vuelve a registrar.
    const seccionFueraDeHorario = page.locator('section.fuera-de-horario');
    const snackbar = page.locator('mat-snack-bar-container');
    let registrada = false;
    for (let intento = 0; intento < 2 && !registrada; intento++) {
      if (await seccionFueraDeHorario.isVisible()) {
        await page.fill('#justificacion', 'Clase registrada por la prueba E2E fuera del horario habitual');
        await page.fill('#horasManual', '1');
        await page.fill('#minutosManual', '0');
      }
      await btnAsistencia.click();
      registrada = await snackbar
        .filter({ hasText: 'Asistencia registrada correctamente' })
        .waitFor({ state: 'visible', timeout: 6_000 })
        .then(() => true, () => false);
    }

    await expect(snackbar).toContainText('Asistencia registrada correctamente');

    // La sesión queda bloqueada: aviso visible, botón y casillas deshabilitados.
    await expect(avisoRegistrada).toBeVisible({ timeout: 5_000 });
    await expect(btnAsistencia).toBeDisabled();
    await expect(checkboxUno).toBeDisabled();
  });
});
