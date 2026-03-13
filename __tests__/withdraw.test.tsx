import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WithdrawPage from '@/app/withdraw/page';
import { useWithdrawStore } from '@/store/withdraw-store';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client');
vi.mock('@/store/withdraw-store');

describe('WithdrawPage', () => {
  const mockSetState = vi.fn();
  const mockSetWithdrawal = vi.fn();
  const mockSetError = vi.fn();
  const mockSetSubmitting = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useWithdrawStore as any).mockReturnValue({
      state: 'idle',
      withdrawal: null,
      error: null,
      isSubmitting: false,
      setState: mockSetState,
      setWithdrawal: mockSetWithdrawal,
      setError: mockSetError,
      setSubmitting: mockSetSubmitting,
      reset: mockReset,
    });
  });

  it('should render the form with all required fields', () => {
    render(<WithdrawPage />);

    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /вывести средства/i })).toBeInTheDocument();
  });

  it('should disable submit button when form is invalid', () => {
    render(<WithdrawPage />);

    const submitButton = screen.getByRole('button', { name: /вывести средства/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when form is valid', async () => {
    const user = userEvent.setup();
    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);

    expect(submitButton).toBeEnabled();
  });

  it('happy path: should successfully submit withdrawal', async () => {
    const user = userEvent.setup();
    const mockWithdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234567890abcdef',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'test-key',
    };

    (apiClient.createWithdrawal as any).mockResolvedValueOnce({
      withdrawal: mockWithdrawal,
    });

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith('loading');
      expect(mockSetSubmitting).toHaveBeenCalledWith(true);
    });

    await waitFor(() => {
      expect(mockSetWithdrawal).toHaveBeenCalledWith(mockWithdrawal);
      expect(mockSetState).toHaveBeenCalledWith('success');
      expect(mockSetSubmitting).toHaveBeenCalledWith(false);
    });
  });

  it('should handle API error gracefully', async () => {
    const user = userEvent.setup();
    const mockError = {
      error: 'Insufficient funds',
      status: 400,
    };

    (apiClient.createWithdrawal as any).mockRejectedValueOnce(mockError);

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith('Insufficient funds');
      expect(mockSetState).toHaveBeenCalledWith('error');
      expect(mockSetSubmitting).toHaveBeenCalledWith(false);
    });
  });

  it('should handle 409 conflict error with custom message', async () => {
    const user = userEvent.setup();
    const mockError = {
      error: 'Conflict',
      status: 409,
      withdrawalId: 'wd_existing',
    };

    (apiClient.createWithdrawal as any).mockRejectedValueOnce(mockError);

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Эта заявка уже была отправлена')
      );
      expect(mockSetState).toHaveBeenCalledWith('error');
    });
  });

  it('should prevent double submit', async () => {
    const user = userEvent.setup();
    const mockWithdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234567890abcdef',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'test-key',
    };

    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.createWithdrawal as any).mockReturnValueOnce(delayedPromise);

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);

    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);

    expect(apiClient.createWithdrawal).toHaveBeenCalledTimes(1);

    resolvePromise!({ withdrawal: mockWithdrawal });

    await waitFor(() => {
      expect(mockSetWithdrawal).toHaveBeenCalledWith(mockWithdrawal);
    });
  });

  it('should disable submit button during submission', async () => {
    (useWithdrawStore as any).mockReturnValue({
      state: 'loading',
      withdrawal: null,
      error: null,
      isSubmitting: true,
      setState: mockSetState,
      setWithdrawal: mockSetWithdrawal,
      setError: mockSetError,
      setSubmitting: mockSetSubmitting,
      reset: mockReset,
    });

    render(<WithdrawPage />);

    const submitButton = screen.getByRole('button', { name: /обработка/i });
    expect(submitButton).toBeDisabled();
  });

  it('should show validation errors when submitting invalid form', async () => {
    const user = userEvent.setup();
    render(<WithdrawPage />);

    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.click(submitButton);

    expect(apiClient.createWithdrawal).not.toHaveBeenCalled();
    expect(submitButton).toBeDisabled();
  });

  it('should reset form after successful submission', async () => {
    const user = userEvent.setup();
    const mockWithdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234567890abcdef',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'test-key',
    };

    (apiClient.createWithdrawal as any).mockResolvedValueOnce({
      withdrawal: mockWithdrawal,
    });

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    const destinationInput = screen.getByPlaceholderText('0x...') as HTMLInputElement;
    const confirmCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /вывести средства/i });

    await user.type(amountInput, '100');
    await user.type(destinationInput, '0x1234567890abcdef');
    await user.click(confirmCheckbox);
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetState).toHaveBeenCalledWith('success');
    });

    expect(amountInput.value).toBe('');
    expect(destinationInput.value).toBe('');
    expect(confirmCheckbox.checked).toBe(false);
  });

  it('should load last withdrawal from storage on mount', () => {
    const mockWithdrawal = {
      id: 'wd_stored',
      amount: 50,
      destination: '0xstored',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'stored-key',
    };

    (useWithdrawStore as any).mockReturnValue({
      state: 'success',
      withdrawal: mockWithdrawal,
      error: null,
      isSubmitting: false,
      setState: mockSetState,
      setWithdrawal: mockSetWithdrawal,
      setError: mockSetError,
      setSubmitting: mockSetSubmitting,
      reset: mockReset,
    });

    render(<WithdrawPage />);

    expect(screen.getByText('Заявка успешно создана')).toBeInTheDocument();
    expect(screen.getByText('wd_stored')).toBeInTheDocument();
    expect(screen.getByText('50 USDT')).toBeInTheDocument();
  });

  it('should call reset when creating new request after success', async () => {
    const user = userEvent.setup();
    const mockWithdrawal = {
      id: 'wd_123',
      amount: 100,
      destination: '0x1234',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'test-key',
    };

    (useWithdrawStore as any).mockReturnValue({
      state: 'success',
      withdrawal: mockWithdrawal,
      error: null,
      isSubmitting: false,
      setState: mockSetState,
      setWithdrawal: mockSetWithdrawal,
      setError: mockSetError,
      setSubmitting: mockSetSubmitting,
      reset: mockReset,
    });

    render(<WithdrawPage />);

    const newRequestButton = screen.getByRole('button', { name: /создать новую заявку/i });
    await user.click(newRequestButton);

    expect(mockReset).toHaveBeenCalled();
  });

  it('should disable inputs during submission', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (apiClient.createWithdrawal as any).mockReturnValueOnce(delayedPromise);
    (useWithdrawStore as any).mockReturnValue({
      state: 'loading',
      withdrawal: null,
      error: null,
      isSubmitting: true,
      setState: mockSetState,
      setWithdrawal: mockSetWithdrawal,
      setError: mockSetError,
      setSubmitting: mockSetSubmitting,
      reset: mockReset,
    });

    render(<WithdrawPage />);

    const amountInput = screen.getByPlaceholderText('0.00');
    const destinationInput = screen.getByPlaceholderText('0x...');
    const confirmCheckbox = screen.getByRole('checkbox');

    expect(amountInput).toBeDisabled();
    expect(destinationInput).toBeDisabled();
    expect(confirmCheckbox).toBeDisabled();

    resolvePromise!({
      withdrawal: {
        id: 'wd_123',
        amount: 100,
        destination: '0x1234567890abcdef',
        status: 'pending',
        createdAt: new Date().toISOString(),
        idempotencyKey: 'test-key',
      },
    });
  });
});
