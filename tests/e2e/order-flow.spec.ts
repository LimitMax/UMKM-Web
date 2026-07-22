import { test, expect } from '@playwright/test';

test.describe('Customer Order Flow & Navigation', () => {
  test('should load the home page and render key elements', async ({ page }) => {
    await page.goto('/');
    
    // Check main title or header content
    await expect(page).toHaveTitle(/UMKM/i);
  });

  test('should load tracking page input interface', async ({ page }) => {
    await page.goto('/order/demo-store/track');

    // Verify search input is visible
    const input = page.locator('#trackingCodeInput');
    await expect(input).toBeVisible();

    // Fill invalid code and submit
    await input.fill('INVALID99');
    await page.locator('button[type="submit"]').click();

    // Verify error alert appears
    const errorAlert = page.locator('text=Pesanan tidak ditemukan');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });
});
