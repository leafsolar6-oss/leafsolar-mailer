import { NextRequest, NextResponse } from 'next/server';
import { getContacts, addContact, bulkAddContacts, deleteContact } from '@/lib/queries';

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get('search') || undefined;
    const listId = req.nextUrl.searchParams.get('listId') || undefined;
    const contacts = getContacts(search, listId);
    return NextResponse.json(contacts);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Bulk import
    if (Array.isArray(body.contacts)) {
      const result = bulkAddContacts(body.contacts);
      return NextResponse.json(result);
    }

    // Single contact
    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const contact = addContact(body);
    return NextResponse.json(contact);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
