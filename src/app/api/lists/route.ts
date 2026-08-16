import { NextRequest, NextResponse } from 'next/server';
import { getLists, createList, deleteList, addContactsToList, getListContactIds } from '@/lib/queries';

export async function GET(req: NextRequest) {
  const listId = req.nextUrl.searchParams.get('contactIds');
  if (listId) {
    const ids = getListContactIds(listId);
    return NextResponse.json(ids);
  }
  const lists = getLists();
  return NextResponse.json(lists);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === 'addContacts') {
      const count = addContactsToList(body.listId, body.contactIds);
      return NextResponse.json({ count });
    }
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const list = createList(body.name, body.description || '');
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    deleteList(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
