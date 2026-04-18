const { test, expect } = require('@playwright/test');

test.describe('Secure Chat E2EE Flow', () => {
  // We assume the app is running at http://localhost:5173 (Vite default) or 3000
  const APP_URL = process.env.APP_URL || 'http://localhost:5173';

  test('E2EE Message Lifecycle: Send -> Edit -> Delete', async ({ browser }) => {
    // 1. Setup two users
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 2. Login User A
    await pageA.goto(`${APP_URL}/login`);
    await pageA.fill('input[type="email"]', 'test-user-a@harmonix.com');
    await pageA.fill('input[type="password"]', 'Password123!');
    await pageA.click('button[type="submit"]');
    
    // 3. Login User B
    await pageB.goto(`${APP_URL}/login`);
    await pageB.fill('input[type="email"]', 'test-user-b@harmonix.com');
    await pageB.fill('input[type="password"]', 'Password123!');
    await pageB.click('button[type="submit"]');

    // 4. Navigate to a shared chat (Assuming target chat exists or using first contact)
    await pageA.click('a[href*="/chat/"]'); // Jump to first chat
    await pageB.click('a[href*="/chat/"]');

    // 5. User A sends an encrypted message
    const secretMessage = 'Top secret session at 9 PM';
    await pageA.fill('input[placeholder*="Secure message"]', secretMessage);
    await pageA.click('button[type="submit"]');

    // 6. User B verifies receipt and decryption
    await expect(pageB.locator(`text=${secretMessage}`)).toBeVisible({ timeout: 10000 });

    // 7. User A edits the message
    // Trigger Context Menu (Right Click)
    await pageA.click(`text=${secretMessage}`, { button: 'right' });
    await pageA.click('button:has-text("Edit Message")');
    
    const updatedMessage = 'Top secret session moved to 10 PM';
    await pageA.fill('input[aria-label="Secure message input"]', updatedMessage);
    await pageA.click('button[type="submit"]');

    // 8. User B sees the update
    await expect(pageB.locator(`text=${updatedMessage}`)).toBeVisible();
    await expect(pageB.locator('text=(edited)')).toBeVisible();

    // 9. User B deletes the message
    await pageB.click(`text=${updatedMessage}`, { button: 'right' });
    await pageB.click('button:has-text("Delete Permanently")');

    // 10. Both users see the deletion
    await expect(pageB.locator(`text=${updatedMessage}`)).not.toBeVisible();
    await expect(pageA.locator(`text=${updatedMessage}`)).not.toBeVisible();
  });
});
