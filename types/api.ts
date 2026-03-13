export interface Withdrawal {
  id: string;
  amount: number;
  destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  idempotencyKey: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  destination: string;
  idempotencyKey: string;
}

export interface CreateWithdrawalResponse {
  withdrawal: Withdrawal;
}

export interface GetWithdrawalResponse {
  withdrawal: Withdrawal;
}

export interface ApiError {
  error: string;
  code?: string;
  status: number;
}
