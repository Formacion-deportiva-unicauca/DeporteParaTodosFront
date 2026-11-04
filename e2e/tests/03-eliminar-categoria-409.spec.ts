import { test, expect, APIRequestContext } from '@playwright/test';
import { authHeaders, injectPerfil } from '../support/auth-setup';
import { API_BASE } from '../support/test-data';

// SCRUM-141: eliminar categoría y verificar manejo de 409.
//
// Estrategia (autocontenida, sin mocks):
//   beforeAll : crea la categoría con nombre único por ejecución (timestamp) vía HTTP real
//               → el backend la guarda con eliminado=0 → visible en /home
//   test      : primera eliminación vía UI real → backend responde 200 → card desaparece
//               segunda eliminación vía page.request.delete() real → backend responde 409
//
// Nombre único por run: evita el problema de soft-delete del run anterior.
// En runs anteriores la categoría quedaba con eliminado=1; un POST del mismo título
// devuelve 409 y el beforeAll lo aceptaba como OK, pero la card no aparecía en la UI.
//
// Nota: el snackbar 'La categoría ya se encuentra eliminada' solo es verificable en la UI
// si la tarjeta sigue visible tras la primera eliminación. HomeComponent llama
// loadCategorias() inmediatamente, por lo que la tarjeta desaparece antes del segundo click.
// Se verifica el 409 a nivel HTTP. Fuera del alcance de este sprint la verificación visual.
test.describe('SCRUM-141 — Eliminar categoría con manejo de 409', () => {
  let apiContext: APIRequestContext;
  let categoriaNombre: string;

  test.beforeAll(async ({ playwright }) => {
    // Nombre único por ejecución → el backend siempre crea una nueva fila con eliminado=0
    categoriaNombre = `CategoriaE2E${Date.now()}`;

    // Sin baseURL: URLs absolutas completas para evitar que /api/v2 sea descartado
    apiContext = await playwright.request.newContext({ extraHTTPHeaders: authHeaders() });
    // imagenId: 201 es obligatorio (todas las categorías existentes lo usan)
    const res = await apiContext.post(`${API_BASE}/categoria`, {
      data: { titulo: categoriaNombre, descripcion: 'Categoría creada por Playwright E2E', imagenId: 201 },
    });
    if (!res.ok()) {
      throw new Error(`Error al crear categoría de test: ${res.status()} — ${await res.text()}`);
    }
  });

  test.afterAll(async () => {
    await apiContext?.dispose();
  });

  test.beforeEach(async ({ page }) => {
    await injectPerfil(page);
  });

  test('primera eliminación vía UI devuelve 200; segunda llamada real devuelve 409', async ({ page }) => {
    await page.goto('/home');

    // Verificar que la tarjeta de la categoría de test está visible
    const tarjeta = page.locator('mat-card', { hasText: categoriaNombre });
    await expect(tarjeta).toBeVisible({ timeout: 10_000 });

    // --- Primera eliminación (flujo UI completo) ---
    await tarjeta.locator('button.btn-menu').click();
    await expect(page.locator('button[mat-menu-item]:has-text("Eliminar")')).toBeVisible();
    await page.locator('button[mat-menu-item]:has-text("Eliminar")').click();

    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await page.locator('button.btn-confirmar').click();

    // HomeComponent llama loadCategorias() → categoría eliminada desaparece del DOM
    await expect(page.locator('mat-dialog-container')).not.toBeVisible({ timeout: 8_000 });
    await expect(tarjeta).not.toBeVisible({ timeout: 8_000 });

    // --- Segunda eliminación (HTTP real, sin mock) ---
    // La tarjeta ya no existe en el DOM. Se llama directamente al backend para
    // verificar que el sistema responde 409 en un segundo intento de eliminación.
    const resp = await page.request.delete(
      `${API_BASE}/categoria?titulo=${encodeURIComponent(categoriaNombre)}`,
      { headers: authHeaders() }
    );
    expect(resp.status()).toBe(409);
  });
});
