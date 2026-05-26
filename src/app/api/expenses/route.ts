import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense, deleteDocById } from '@/lib/db';

// Transformar snake_case (Firestore) a camelCase (frontend)
function toCamelExpense(e: Record<string, unknown>) {
  return {
    id: e.id,
    description: e.description,
    amount: e.amount || 0,
    category: e.category,
    date: e.date,
    notes: e.notes,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  };
}

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

    return NextResponse.json(expenses.map(toCamelExpense));
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 });
    }

    await deleteDocById('expenses', id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
