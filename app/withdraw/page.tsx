'use client';

import { useState, useEffect, useRef } from 'react';
import { useWithdrawStore, getLastWithdrawalIfValid } from '@/store/withdraw-store';
import { apiClient } from '@/lib/api-client';
import { ApiError } from '@/types/api';
import { withdrawFormSchema, WithdrawFormData } from '@/lib/validation';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export default function WithdrawPage() {
  const {
    state,
    withdrawal,
    error,
    isSubmitting,
    setState,
    setWithdrawal,
    setError,
    setSubmitting,
    reset,
  } = useWithdrawStore();

  const [formData, setFormData] = useState<WithdrawFormData>({
    amount: 0,
    destination: '',
    confirm: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [idempotencyKey] = useState(() => nanoid());
  const submitAttemptRef = useRef(false);

  useEffect(() => {
    const lastWithdrawal = getLastWithdrawalIfValid();
    if (lastWithdrawal) {
      setWithdrawal(lastWithdrawal);
      setState('success');
    }
  }, [setWithdrawal, setState]);

  const validateForm = (): boolean => {
    try {
      withdrawFormSchema.parse(formData);
      setFieldErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((error) => {
          if (error.path[0]) {
            errors[error.path[0].toString()] = error.message;
          }
        });
        setFieldErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitAttemptRef.current || isSubmitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    submitAttemptRef.current = true;
    setSubmitting(true);
    setState('loading');
    setError(null);

    try {
      const response = await apiClient.createWithdrawal({
        amount: formData.amount,
        destination: formData.destination,
        idempotencyKey,
      });

      setWithdrawal(response.withdrawal);
      setState('success');
      
      setFormData({ amount: 0, destination: '', confirm: false });
    } catch (err) {
      const apiError = err as ApiError & { withdrawalId?: string };
      
      if (apiError.status === 409) {
        setError(
          'Эта заявка уже была отправлена. Обновите страницу, чтобы создать новую заявку.'
        );
      } else if (apiError.error) {
        setError(apiError.error);
      } else {
        setError('Произошла ошибка при создании заявки. Попробуйте еще раз.');
      }
      
      setState('error');
    } finally {
      setSubmitting(false);
      submitAttemptRef.current = false;
    }
  };

  const handleReset = () => {
    reset();
    setFormData({ amount: 0, destination: '', confirm: false });
    setFieldErrors({});
    submitAttemptRef.current = false;
  };

  const isFormValid =
    formData.amount > 0 &&
    formData.destination.trim().length > 0 &&
    formData.confirm === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Вывод средств
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            USDT Withdrawal
          </p>

          {state === 'success' && withdrawal && (
            <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">
                    Заявка успешно создана
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">ID:</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {withdrawal.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Сумма:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {withdrawal.amount} USDT
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Адрес:</span>
                      <span className="font-mono text-slate-900 dark:text-white break-all">
                        {withdrawal.destination}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Статус:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        {withdrawal.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Создано:</span>
                      <span className="text-slate-900 dark:text-white">
                        {new Date(withdrawal.createdAt).toLocaleString('ru-RU')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-4 text-sm text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                  >
                    Создать новую заявку →
                  </button>
                </div>
              </div>
            </div>
          )}

          {state === 'error' && error && (
            <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Ошибка
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {state !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Сумма (USDT) *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    fieldErrors.amount
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-slate-300 dark:border-slate-600'
                  } bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  placeholder="0.00"
                />
                {fieldErrors.amount && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="destination"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Адрес назначения *
                </label>
                <input
                  id="destination"
                  type="text"
                  value={formData.destination}
                  onChange={(e) =>
                    setFormData({ ...formData, destination: e.target.value })
                  }
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    fieldErrors.destination
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-slate-300 dark:border-slate-600'
                  } bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono`}
                  placeholder="0x..."
                />
                {fieldErrors.destination && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {fieldErrors.destination}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <input
                  id="confirm"
                  type="checkbox"
                  checked={formData.confirm}
                  onChange={(e) =>
                    setFormData({ ...formData, confirm: e.target.checked })
                  }
                  disabled={isSubmitting}
                  className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label
                  htmlFor="confirm"
                  className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                >
                  Я подтверждаю, что проверил адрес назначения и понимаю, что транзакция
                  необратима *
                </label>
              </div>
              {fieldErrors.confirm && (
                <p className="text-sm text-red-600 dark:text-red-400 -mt-4">
                  {fieldErrors.confirm}
                </p>
              )}

              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="w-full py-3 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-semibold disabled:cursor-not-allowed disabled:opacity-50 transition-colors focus:ring-4 focus:ring-blue-500/50 dark:focus:ring-blue-400/50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Обработка...
                  </span>
                ) : (
                  'Вывести средства'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
