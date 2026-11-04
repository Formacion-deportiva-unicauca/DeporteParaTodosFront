import { test, expect } from '@playwright/test';
import { injectPerfil } from '../support/auth-setup';
import { TEST_INSTRUCTOR_BASE } from '../support/test-data';

// SCRUM-137: registrar instructor desde lista-instructores.
// Correo único por ejecución (Date.now()) → sin conflictos entre runs de CI.
test.describe('SCRUM-137 — Registrar instructor', () => {
  test.beforeEach(async ({ page }) => {
    await injectPerfil(page);
  });

  test('registra nuevo instructor y aparece en la tabla sin recargar página', async ({ page }) => {
    // Correo e identificación únicos por ejecución.
    // El backend valida la identificación (cédula) como llave única, no solo el correo.
    const ts = Date.now();
    const correo = `instructor.e2e.${ts}@unicauca.edu.co`;
    const id = String(ts).slice(-10); // 10 dígitos finales del timestamp → válido como CC
    const alumnoCodigo = `PLW${String(ts).slice(-5)}`;

    await page.goto('/lista-instructores');

    // Esperar que la tabla cargue
    await expect(page.locator('table[mat-table]')).toBeVisible();

    // Contar filas iniciales
    const filasPrevias = await page.locator('tr[mat-row]').count();

    // Abrir formulario
    await page.locator('button.btnAgregar').click();

    await expect(page.locator('mat-dialog-content')).toBeVisible();
    await expect(page.locator('mat-dialog-content header')).toContainText('Registrar instructor');

    // Campos de texto
    await page.fill('input[name="nombre"]', TEST_INSTRUCTOR_BASE.nombre);
    await page.fill('input[name="correo"]', correo);

    // Tipo de identificación (mat-select)
    await page.locator('mat-select[name="tipodocumento"]').click();
    await page.locator(`mat-option:has-text("${TEST_INSTRUCTOR_BASE.tipoId}")`).first().click();

    await page.fill('input[name="identificacion"]', id);

    // Sexo (mat-select)
    await page.locator('mat-select[name="sexo"]').click();
    await page.locator(`mat-option:has-text("${TEST_INSTRUCTOR_BASE.sexo}")`).first().click();

    await page.fill('input[name="codigo"]', alumnoCodigo);

    // Submit
    await page.locator('button.aceptar').click();

    // Dialog cierra tras el POST exitoso
    await expect(page.locator('mat-dialog-content')).not.toBeVisible({ timeout: 8_000 });

    // La tabla recarga (cargarInstructores) y muestra una fila más
    await expect(page.locator('tr[mat-row]')).toHaveCount(filasPrevias + 1, { timeout: 8_000 });

    // El nombre del instructor nuevo aparece en la tabla.
    // .first() evita strict-mode violation: pueden existir instructores
    // con el mismo nombre de runs anteriores (el backend no valida nombre único).
    await expect(page.locator(`td:has-text("${TEST_INSTRUCTOR_BASE.nombre}")`).first()).toBeVisible();
  });
});
