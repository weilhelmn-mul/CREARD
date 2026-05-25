import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const expenses = await getExpenses({
      category: category || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount, category, date, notes } = body;

    if (!description || !amount || !category || !date) {
      return NextResponse.json(
        { error: 'description, amount, category, and date are required' },
        { status: 400 }
      );
    }

    const id = await createExpense({
      description,
      amount: parseFloat(amount) || 0,
      category,
      date,
      notes: notes || null,
    });

    return NextResponse.json({ id, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
