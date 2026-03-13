import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Withdrawal } from '@/types/api';

type WithdrawState = 'idle' | 'loading' | 'success' | 'error';

interface WithdrawStore {
  state: WithdrawState;
  withdrawal: Withdrawal | null;
  error: string | null;
  isSubmitting: boolean;
  lastWithdrawal: Withdrawal | null;
  lastWithdrawalTimestamp: number | null;

  setState: (state: WithdrawState) => void;
  setWithdrawal: (withdrawal: Withdrawal | null) => void;
  setError: (error: string | null) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setLastWithdrawal: (withdrawal: Withdrawal | null) => void;
  reset: () => void;
  clearLastWithdrawal: () => void;
}

const FIVE_MINUTES = 5 * 60 * 1000;

export const useWithdrawStore = create<WithdrawStore>()(
  persist(
    (set) => ({
      state: 'idle',
      withdrawal: null,
      error: null,
      isSubmitting: false,
      lastWithdrawal: null,
      lastWithdrawalTimestamp: null,

      setState: (state) => set({ state }),
      
      setWithdrawal: (withdrawal) => set({ 
        withdrawal,
        lastWithdrawal: withdrawal,
        lastWithdrawalTimestamp: withdrawal ? Date.now() : null,
      }),
      
      setError: (error) => set({ error }),
      
      setSubmitting: (isSubmitting) => set({ isSubmitting }),
      
      setLastWithdrawal: (withdrawal) => set({ 
        lastWithdrawal: withdrawal,
        lastWithdrawalTimestamp: withdrawal ? Date.now() : null,
      }),
      
      reset: () => set({ 
        state: 'idle', 
        withdrawal: null, 
        error: null, 
        isSubmitting: false 
      }),
      
      clearLastWithdrawal: () => set({ 
        lastWithdrawal: null, 
        lastWithdrawalTimestamp: null 
      }),
    }),
    {
      name: 'withdraw-storage',
      partialize: (state) => ({
        lastWithdrawal: state.lastWithdrawal,
        lastWithdrawalTimestamp: state.lastWithdrawalTimestamp,
      }),
    }
  )
);

export const getLastWithdrawalIfValid = (): Withdrawal | null => {
  const { lastWithdrawal, lastWithdrawalTimestamp } = useWithdrawStore.getState();
  
  if (!lastWithdrawal || !lastWithdrawalTimestamp) {
    return null;
  }

  const now = Date.now();
  const elapsed = now - lastWithdrawalTimestamp;

  if (elapsed > FIVE_MINUTES) {
    useWithdrawStore.getState().clearLastWithdrawal();
    return null;
  }

  return lastWithdrawal;
};
