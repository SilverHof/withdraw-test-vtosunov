import { NextRequest, NextResponse } from 'next/server';

const withdrawals = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const withdrawal = withdrawals.get(id);

    if (!withdrawal) {
      return NextResponse.json(
        { error: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ withdrawal });
  } catch (error) {
    console.error('Error fetching withdrawal:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
