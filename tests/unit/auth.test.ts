import { describe, it, expect, vi, beforeEach } from 'vitest';

const resetPasswordForEmail = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail } },
}));

const { requestPasswordReset } = await import('../../src/lib/auth');

describe('requestPasswordReset', () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    vi.stubGlobal('window', { location: { origin: 'https://www.cafepalestinecolonia.de' } });
  });

  it('sends the reset email with a link back to the set-password page', async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    const result = await requestPasswordReset('alaa@example.com');

    expect(result).toEqual({ success: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith('alaa@example.com', {
      redirectTo: 'https://www.cafepalestinecolonia.de/admin/set-password',
    });
  });

  it('follows the current origin so previews and localhost link back to themselves', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:4321' } });
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await requestPasswordReset('a@example.com');

    expect(resetPasswordForEmail.mock.calls[0][1].redirectTo).toBe('http://localhost:4321/admin/set-password');
  });

  it('returns the Supabase error message on failure', async () => {
    resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'For security purposes, you can only request this after 60 seconds.' },
    });

    const result = await requestPasswordReset('a@example.com');

    expect(result).toEqual({
      success: false,
      error: 'For security purposes, you can only request this after 60 seconds.',
    });
  });
});
