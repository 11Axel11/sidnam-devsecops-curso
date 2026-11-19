import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const credentials = {
  admin: { cedula: '900000001', password: process.env.E2E_ADMIN_PASSWORD! },
  reader: { cedula: '900000002', password: process.env.E2E_READER_PASSWORD! },
  inactive: { cedula: '900000003', password: process.env.E2E_INACTIVE_PASSWORD! },
};
async function findCatalogRow(page: Page, name: string) {
  await expect(page.getByRole('table')).toBeVisible();
  const previous = page.getByRole('button', { name: 'Previa', exact: true });
  for (let i = 0; i < 100 && await previous.isEnabled(); i++) await previous.click();
  const row = page.getByRole('row').filter({ hasText: name });
  for (let i = 0; i < 100 && !await row.count(); i++) {
    const next = page.getByRole('button', { name: 'Siguiente', exact: true });
    if (await next.isDisabled()) break;
    await next.click();
  }
  await expect(row).toBeVisible();
  return row;
}
async function login(page: Page, role: keyof typeof credentials = 'admin') {
  await page.goto('/login');
  await page.getByLabel('Cédula', { exact: true }).fill(credentials[role].cedula);
  await page.getByLabel('Contraseña', { exact: true }).fill(credentials[role].password);
  const response = page.waitForResponse(r => r.url().endsWith('/api/autenticacion/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();
  const result = await response;
  if (result.status() === 200) {
    await page.waitForURL(url => url.pathname === '/');
    await expect(page.getByText('Bienvenido al sistema SIDNAM', { exact: true })).toBeVisible();
  }
  return result;
}
test.beforeEach(async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).environment).toBe('staging');
  for (const value of Object.values(credentials)) expect(value.password?.length).toBeGreaterThanOrEqual(16);
});
test('anonymous users cannot access protected UI or API', async ({ page, request }) => {
  expect((await request.get('/api/catalogos/antecedente-personal')).status()).toBe(401);
  await page.goto('/ajustes/catalogos');
  await expect(page).toHaveURL(/\/login/);
});
test('invalid password and inactive user are rejected', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Cédula', { exact: true }).fill(credentials.admin.cedula);
  await page.getByLabel('Contraseña', { exact: true }).fill(randomUUID());
  const invalid = page.waitForResponse(r => r.url().endsWith('/api/autenticacion/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /iniciar sesi[oó]n/i }).click();
  expect((await invalid).status()).toBe(401);
  expect((await login(page, 'inactive')).status()).toBe(403);
});
test('catalog lifecycle persists; invalid input fails; session renews and closes', async ({ page, context }) => {
  expect((await login(page)).status()).toBe(200);
  const accessCookie = (await context.cookies()).find(cookie => cookie.name === 'sidnam_staging_access_token');
  expect(accessCookie?.httpOnly).toBe(true);
  expect(accessCookie?.secure).toBe(new URL(process.env.E2E_BASE_URL!).protocol === 'https:');
  expect(accessCookie?.domain).toBe(new URL(process.env.E2E_BASE_URL!).hostname);
  await page.goto('/ajustes/catalogos');
  const name = `E2E ${randomUUID()}`;
  await page.getByRole('button', { name: 'Agregar ítem', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill(name);
  const created = page.waitForResponse(r => r.url().endsWith('/api/catalogos/antecedente-personal') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  expect((await created).status()).toBe(201);
  const item = await (await created).json();
  try {
    await page.reload();
    let row = await findCatalogRow(page, name);
    await row.getByRole('button', { name: 'Desactivar', exact: true }).click();
    const deactivated = page.waitForResponse(r => r.url().endsWith(`/${item.id}/desactivar`) && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    expect((await deactivated).status()).toBe(200);
    const allItems = page.waitForResponse(r => r.url().includes('/api/catalogos/antecedente-personal?soloActivos=false'));
    await page.getByRole('switch', { name: 'Ver inactivos' }).check();
    expect((await allItems).status()).toBe(200);
    row = await findCatalogRow(page, name);
    await expect(row.getByText('Inactivo', { exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Reactivar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
    await expect(row.getByText('Activo', { exact: true })).toBeVisible();
    const headers = { Origin: process.env.E2E_BASE_URL! };
    expect((await context.request.post('/api/catalogos/antecedente-personal', { data: { nombre: '', injected: true }, headers })).status()).toBe(400);
    expect((await context.request.post('/api/autenticacion/refresh', { headers })).status()).toBe(200);
    expect((await context.request.get('/api/autenticacion/me')).status()).toBe(200);
  } finally {
    await context.request.patch(`/api/catalogos/antecedente-personal/${item.id}/desactivar`, { headers: { Origin: process.env.E2E_BASE_URL! } });
  }
  await context.request.post('/api/autenticacion/logout', { headers: { Origin: process.env.E2E_BASE_URL! } });
  expect((await context.request.get('/api/autenticacion/me')).status()).toBe(401);
  await page.goto('/ajustes/catalogos');
  await expect(page).toHaveURL(/\/login/);
});
test('read-only user cannot mutate via UI or direct API', async ({ page, context }) => {
  expect((await login(page, 'reader')).status()).toBe(200);
  await page.goto('/ajustes/catalogos');
  await expect(page.getByRole('button', { name: 'Agregar ítem', exact: true })).toHaveCount(0);
  expect((await context.request.post('/api/catalogos/antecedente-personal', { data: { nombre: `Forbidden ${randomUUID()}` }, headers: { Origin: process.env.E2E_BASE_URL! } })).status()).toBe(403);
});
test('untrusted origins cannot write with cookies', async ({ page, context }) => {
  await login(page);
  expect((await context.request.post('/api/catalogos/antecedente-personal', { data: { nombre: 'Forbidden origin' }, headers: { Origin: 'https://untrusted.example.invalid' } })).status()).toBeGreaterThanOrEqual(400);
});
