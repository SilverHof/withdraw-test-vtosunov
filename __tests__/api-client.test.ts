import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/api-client';

global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully create withdrawal', async () => {
    const mockResponse = {
      withdrawal: {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'key-123',
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await apiClient.createWithdrawal({
      amount: 100,
      destination: '0x1234',
      idempotencyKey: 'key-123',
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/withdrawals',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should handle 409 conflict error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Conflict',
        withdrawalId: 'wd_existing',
      }),
    });

    await expect(
      apiClient.createWithdrawal({
        amount: 100,
        destination: '0x1234',
        idempotencyKey: 'key-123',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'CONFLICT',
    });
  });

  it('should retry on network error', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockRejectedValueOnce(new TypeError('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          withdrawal: {
            id: 'wd_123',
            amount: 100,
            destination: '0x1234',
            status: 'pending',
            createdAt: new Date().toISOString(),
            idempotencyKey: 'key-123',
          },
        }),
      });

    const result = await apiClient.createWithdrawal({
      amount: 100,
      destination: '0x1234',
      idempotencyKey: 'key-123',
    });

    expect(result.withdrawal.id).toBe('wd_123');
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry on 500 error', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          withdrawal: {
            id: 'wd_123',
            amount: 100,
            destination: '0x1234',
            status: 'pending',
            createdAt: new Date().toISOString(),
            idempotencyKey: 'key-123',
          },
        }),
      });

    const result = await apiClient.createWithdrawal({
      amount: 100,
      destination: '0x1234',
      idempotencyKey: 'key-123',
    });

    expect(result.withdrawal.id).toBe('wd_123');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 400 error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request' }),
    });

    await expect(
      apiClient.createWithdrawal({
        amount: -100,
        destination: '',
        idempotencyKey: 'key-123',
      })
    ).rejects.toMatchObject({
      status: 400,
      error: 'Bad request',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
