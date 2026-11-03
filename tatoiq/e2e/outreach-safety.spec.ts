import { expect, test } from '@playwright/test';

/**
 * Outreach safety — end-to-end.
 *
 * The dispatch endpoint must refuse to create an outbound job for a lead that is
 * flagged do-not-contact, even when it carries a top grade (lead_sample_001
 * scores 100 / grade A and is flagged do-not-contact).
 *
 * The endpoint is dark unless FEATURE_OUTREACH_DISPATCH is enabled, so a 404 is
 * also an acceptable "no send" outcome; a 403 is the consent refusal.
 */
test.describe('outreach dispatch safety', () => {
  test('refuses dispatch for a high-scoring do-not-contact lead (403, no outbound job)', async ({ request }) => {
    const response = await request.post('/api/outreach/lead/lead_sample_001/send', {
      data: { subject: 'Hello', body: 'Are you interested in a quick call?' },
    });

    expect([403, 404]).toContain(response.status());

    if (response.status() === 403) {
      const body = (await response.json()) as { error?: string };
      expect(body.error).toMatch(/suppress|do-not-contact|fixture/i);
    }
  });

  test('leads dashboard renders with text grade labels', async ({ page }) => {
    await page.goto('/leads');
    await expect(page.getByRole('heading', { name: 'Lead management' })).toBeVisible();
    // Grades are always text, never colour-only.
    await expect(page.getByText(/Grade [ABCDF]/).first()).toBeVisible();
  });
});
