import { test, expect } from '@playwright/test';

test.describe('Order Tracking & Cashier Critical Workflow', () => {
  test('should render store tracking page UI correctly', async ({ page }) => {
    await page.goto('/order/demo-store/track');

    // Header title
    await expect(page.locator('h1')).toContainText(/Toko|UMKM/i);

    // Check tracking form
    const trackingInput = page.locator('#trackingCodeInput');
    await expect(trackingInput).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Cek Status Pesanan');
  });

  test('should render cashier queue portal', async ({ page }) => {
    await page.goto('/cashier');

    // Cashier queue interface checks
    await expect(page.locator('body')).toBeVisible();
  });
});
