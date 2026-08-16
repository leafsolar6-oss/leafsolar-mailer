import { NextRequest, NextResponse } from 'next/server';
import {
  getLists, createList, deleteList, addContactsToList,
  removeContactsFromList, getListContactIds, updateListMeta,
} from '@/lib/queries';
import { bulkAddContacts } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const contactIds = req.nextUrl.searchParams.get('contactIds');
  if (contactIds) {
    return NextResponse.json(getListContactIds(contactIds));
  }
  return NextResponse.json(getLists());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Remove contacts from a list
    if (body.action === 'removeContacts') {
      const removed = removeContactsFromList(body.listId, body.contactIds || []);
      return NextResponse.json({ success: true, removed });
    }

    // Add existing contacts to a list
    if (body.action === 'addContacts') {
      const count = addContactsToList(body.listId, body.contactIds || []);
      return NextResponse.json({ success: true, count });
    }

    // Bulk-import new contacts directly into a list
    if (body.action === 'importContacts') {
      const result = bulkAddContacts(body.contacts || []);
      if (body.listId && result.success > 0) {
        const emails = new Set(
          (body.contacts as any[])
            .map((c: any) => (c.email || '').toLowerCase().trim())
            .filter(Boolean)
        );
        // getContacts is imported lazily to avoid cycle
        const { getContacts } = await import('@/lib/queries');
        const ids = getContacts()
          .filter(c => emails.has(c.email.toLowerCase()))
          .map(c => c.id);
        if (ids.length) addContactsToList(body.listId, ids);
      }
      return NextResponse.json(result);
    }

    // Rename / update list
    if (body.action === 'update') {
      updateListMeta(body.listId, { name: body.name, description: body.description });
      return NextResponse.json({ success: true });
    }

    // Create list
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
