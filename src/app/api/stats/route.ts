import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/queries';

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
