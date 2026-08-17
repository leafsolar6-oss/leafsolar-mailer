import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, createTemplate, deleteTemplate } from '@/lib/queries';
import { requireAuth } from '@/lib/auth';
import { syncFromPersist } from '@/lib/store';

export async function GET(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    await syncFromPersist();
    return NextResponse.json(getTemplates());
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    const template = createTemplate(body);
    return NextResponse.json(template);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const { id } = await req.json();
    deleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
