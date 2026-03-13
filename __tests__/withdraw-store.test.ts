import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWithdrawStore, getLastWithdrawalIfValid } from '@/store/withdraw-store';
import { Withdrawal } from '@/types/api';

describe('Withdraw Store', () => {
  beforeEach(() => {
    const store = useWithdrawStore.getState();
    store.reset();
    store.clearLastWithdrawal();
  });

  it('should initialize with idle state', () => {
    const state = useWithdrawStore.getState();
    expect(state.state).toBe('idle');
    expect(state.withdrawal).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isSubmitting).toBe(false);
  });

  it('should update state', () => {
    const store = useWithdrawStore.getState();
    store.setState('loading');
    expect(useWithdrawStore.getState().state).toBe('loading');
  });

  it('should set withdrawal and update lastWithdrawal', () => {
    const mockWithdrawal: Withdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234',
      status: 'pending',
      createdAt: new Date().toISOString(),
      idempotencyKey: 'key-123',
    };

    const store = useWithdrawStore.getState();
    store.setWithdrawal(mockWithdrawal);

    const state = useWithdrawStore.getState();
    expect(state.withdrawal).toEqual(mockWithdrawal);
    expect(state.lastWithdrawal).toEqual(mockWithdrawal);
    expect(state.lastWithdrawalTimestamp).toBeTypeOf('number');
  });

  it('should set error', () => {
    const store = useWithdrawStore.getState();
    store.setError('Test error');
    expect(useWithdrawStore.getState().error).toBe('Test error');
  });

  it('should set submitting state', () => {
    const store = useWithdrawStore.getState();
    store.setSubmitting(true);
    expect(useWithdrawStore.getState().isSubmitting).toBe(true);
  });

  it('should reset to initial state but preserve lastWithdrawal', () => {
    const store = useWithdrawStore.getState();
    const mockWithdrawal: Withdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234',
      status: 'pending',
      createdAt: new Date().toISOString(),
      idempotencyKey: 'key-123',
    };

    store.setWithdrawal(mockWithdrawal);
    store.setState('success');
    store.setError('Some error');
    store.setSubmitting(true);

    store.reset();

    const state = useWithdrawStore.getState();
    expect(state.state).toBe('idle');
    expect(state.withdrawal).toBeNull();
    expect(state.error).toBeNull();
    expect(state.isSubmitting).toBe(false);
    expect(state.lastWithdrawal).toEqual(mockWithdrawal);
  });

  it('should clear lastWithdrawal', () => {
    const store = useWithdrawStore.getState();
    const mockWithdrawal: Withdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234',
      status: 'pending',
      createdAt: new Date().toISOString(),
      idempotencyKey: 'key-123',
    };

    store.setWithdrawal(mockWithdrawal);
    expect(useWithdrawStore.getState().lastWithdrawal).toEqual(mockWithdrawal);

    store.clearLastWithdrawal();
    const state = useWithdrawStore.getState();
    expect(state.lastWithdrawal).toBeNull();
    expect(state.lastWithdrawalTimestamp).toBeNull();
  });

  describe('getLastWithdrawalIfValid', () => {
    it('should return null if no lastWithdrawal exists', () => {
      const result = getLastWithdrawalIfValid();
      expect(result).toBeNull();
    });

    it('should return withdrawal if within 5 minutes', () => {
      const mockWithdrawal: Withdrawal = {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'key-123',
      };

      const store = useWithdrawStore.getState();
      store.setLastWithdrawal(mockWithdrawal);

      const result = getLastWithdrawalIfValid();
      expect(result).toEqual(mockWithdrawal);
    });

    it('should return null and clear if older than 5 minutes', () => {
      const mockWithdrawal: Withdrawal = {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'key-123',
      };

      const store = useWithdrawStore.getState();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000 - 1000;
      
      store.setLastWithdrawal(mockWithdrawal);
      useWithdrawStore.setState({ lastWithdrawalTimestamp: fiveMinutesAgo });

      const result = getLastWithdrawalIfValid();
      expect(result).toBeNull();

      const state = useWithdrawStore.getState();
      expect(state.lastWithdrawal).toBeNull();
      expect(state.lastWithdrawalTimestamp).toBeNull();
    });

    it('should return withdrawal exactly at 5 minute boundary', () => {
      const mockWithdrawal: Withdrawal = {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'key-123',
      };

      const store = useWithdrawStore.getState();
      const exactlyFiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      
      store.setLastWithdrawal(mockWithdrawal);
      useWithdrawStore.setState({ lastWithdrawalTimestamp: exactlyFiveMinutesAgo });

      const result = getLastWithdrawalIfValid();
      expect(result).toEqual(mockWithdrawal);
    });

    it('should return null if timestamp is null', () => {
      const mockWithdrawal: Withdrawal = {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'key-123',
      };

      useWithdrawStore.setState({ 
        lastWithdrawal: mockWithdrawal, 
        lastWithdrawalTimestamp: null 
      });

      const result = getLastWithdrawalIfValid();
      expect(result).toBeNull();
    });
  });
});
