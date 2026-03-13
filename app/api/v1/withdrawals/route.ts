import { NextRequest, NextResponse } from 'next/server';
import { CreateWithdrawalRequest, Withdrawal } from '@/types/api';

const withdrawals = new Map<string, Withdrawal>();
const idempotencyKeys = new Map<string, string>();

export async function POST(request: NextRequest) {
  try {
    const body: CreateWithdrawalRequest = await request.json();
    const { amount, destination, idempotencyKey } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!destination || destination.trim().length === 0) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency key is required' },
        { status: 400 }
      );
    }

    const existingWithdrawalId = idempotencyKeys.get(idempotencyKey);
    if (existingWithdrawalId) {
      const existingWithdrawal = withdrawals.get(existingWithdrawalId);
      if (existingWithdrawal) {
        return NextResponse.json(
          { 
            error: 'A withdrawal with this idempotency key already exists',
            withdrawalId: existingWithdrawalId 
          },
          { status: 409 }
        );
      }
    }

    const withdrawal: Withdrawal = {
      id: `wd_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount,
      destination,
      status: 'pending',
      createdAt: new Date().toISOString(),
      idempotencyKey,
    };

    withdrawals.set(withdrawal.id, withdrawal);
    idempotencyKeys.set(idempotencyKey, withdrawal.id);

    setTimeout(() => {
      const w = withdrawals.get(withdrawal.id);
      if (w) {
        w.status = 'completed';
        withdrawals.set(withdrawal.id, w);
      }
    }, 2000);

    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
