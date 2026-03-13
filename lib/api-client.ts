import { CreateWithdrawalRequest, CreateWithdrawalResponse, GetWithdrawalResponse, ApiError } from '@/types/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/v1';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries = MAX_RETRIES
  ): Promise<T> {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        if (response.status === 409) {
          throw {
            error: errorData.error || 'Conflict: Request already exists',
            code: 'CONFLICT',
            status: response.status,
            withdrawalId: errorData.withdrawalId,
          } as ApiError & { withdrawalId?: string };
        }

        throw {
          error: errorData.error || `HTTP ${response.status}`,
          code: errorData.code,
          status: response.status,
        } as ApiError;
      }

      return response.json();
    } catch (error) {
      if (retries > 0 && this.isNetworkError(error)) {
        await this.delay(RETRY_DELAY);
        return this.fetchWithRetry<T>(url, options, retries - 1);
      }
      throw error;
    }
  }

  private isNetworkError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      if ('status' in error) {
        const status = (error as ApiError).status;
        return status >= 500 || status === 0;
      }
      if (error instanceof TypeError) {
        return true;
      }
    }
    return false;
  }

  async createWithdrawal(data: CreateWithdrawalRequest): Promise<CreateWithdrawalResponse> {
    return this.fetchWithRetry<CreateWithdrawalResponse>(
      `${this.baseUrl}/withdrawals`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );
  }

  async getWithdrawal(id: string): Promise<GetWithdrawalResponse> {
    return this.fetchWithRetry<GetWithdrawalResponse>(
      `${this.baseUrl}/withdrawals/${id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const apiClient = new ApiClient();
