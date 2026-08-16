import { NextRequest, NextResponse } from 'next/server';
import {
  getContacts, addContact, bulkAddContacts, deleteContacts, addContactsToList,
  updateContact, setContactLists,
} from '@/lib/queries';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const listId = req.nextUrl.searchParams.get('listId') || undefined;
    const includeLists = req.nextUrl.searchParams.get('includeLists') === '1';
    const contacts = getContacts(search, listId, includeLists);
    return NextResponse.json(contacts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();

    // Bulk import (optionally assign to a list via listId or list_ids)
    if (Array.isArray(body.contacts)) {
      const result = bulkAddContacts(body.contacts);
      const targetLists: string[] = body.listId
        ? [body.listId]
        : (Array.isArray(body.list_ids) ? body.list_ids : []);
      if (targetLists.length && result.success > 0) {
        const emails = new Set(
          (body.contacts as any[])
            .map((c: any) => (c.email || '').toLowerCase().trim())
            .filter(Boolean)
        );
        const imported = getContacts();
        const ids = imported
          .filter(c => emails.has(c.email.toLowerCase()))
          .map(c => c.id);
        for (const lid of targetLists) {
          if (ids.length) addContactsToList(lid, ids);
        }
      }
      return NextResponse.json(result);
    }

    // Single contact (list_ids assigns the new contact to lists immediately)
    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const contact = addContact(body);
    if (Array.isArray(body.list_ids) && body.list_ids.length) {
      setContactLists(contact.id, body.list_ids);
    }
    return NextResponse.json({ ...contact, list_ids: body.list_ids || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    const { id, ...patch } = body;
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    const updated = updateContact(id, patch);
    if (!updated) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids : (body.id ? [body.id] : []);
    if (!ids.length) return NextResponse.json({ error: 'Contact id(s) required' }, { status: 400 });
    const removed = deleteContacts(ids);
    return NextResponse.json({ success: true, removed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
