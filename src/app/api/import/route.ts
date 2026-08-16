import { NextRequest, NextResponse } from 'next/server';
import { bulkAddContacts, addContactsToList } from '@/lib/queries';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await requireAuth(req))) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const listId = (formData.get('listId') as string) || '';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    let contacts: any[] = [];

    if (fileName.endsWith('.csv')) {
      const text = buffer.toString('utf-8');
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      contacts = (result.data as any[]).map(row => {
        const keys = Object.keys(row);
        const emailKey = keys.find(k => k.toLowerCase().includes('email'));
        const nameKey = keys.find(k => k.toLowerCase().includes('name'));
        const companyKey = keys.find(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('organization'));
        const phoneKey = keys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile') || k.toLowerCase().includes('tel'));
        return {
          email: (row[emailKey || ''] || row['email'] || '').trim(),
          name: (row[nameKey || ''] || row['name'] || '').trim(),
          company: (row[companyKey || ''] || '').trim(),
          phone: (row[phoneKey || ''] || '').trim(),
          source: 'csv-import',
          tags: ['imported'],
        };
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet) as any[];
      contacts = rows.map(row => {
        const keys = Object.keys(row);
        const emailKey = keys.find(k => k.toLowerCase().includes('email'));
        const nameKey = keys.find(k => k.toLowerCase().includes('name'));
        const companyKey = keys.find(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('organization'));
        const phoneKey = keys.find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile'));
        return {
          email: String(row[emailKey || ''] || row['email'] || '').trim(),
          name: String(row[nameKey || ''] || row['name'] || '').trim(),
          company: String(row[companyKey || ''] || '').trim(),
          phone: String(row[phoneKey || ''] || '').trim(),
          source: 'excel-import',
          tags: ['imported'],
        };
      });
    } else if (fileName.endsWith('.txt')) {
      const text = buffer.toString('utf-8');
      const emails = text.split(/[\n,;]/).map(e => e.trim()).filter(e => e);
      contacts = emails.map(email => ({
        email,
        name: '',
        company: '',
        phone: '',
        source: 'txt-import',
        tags: ['imported'],
      }));
    } else if (fileName.endsWith('.vcf')) {
      const text = buffer.toString('utf-8');
      const vcards = text.split('END:VCARD');
      contacts = vcards.map(vcard => {
        const emailMatch = vcard.match(/EMAIL[^:]*:(.+)/);
        const nameMatch = vcard.match(/FN:(.+)/);
        return {
          email: (emailMatch ? emailMatch[1].trim() : ''),
          name: nameMatch ? nameMatch[1].trim() : '',
          company: '',
          phone: '',
          source: 'vcard-import',
          tags: ['imported'],
        };
      }).filter(c => c.email);
    } else {
      return NextResponse.json({ error: 'Unsupported file format. Use CSV, XLSX, TXT, or VCF.' }, { status: 400 });
    }

    const result = bulkAddContacts(contacts);

    // Optionally assign the newly imported contacts straight to a list.
    if (listId && result.success > 0) {
      const { getContacts } = await import('@/lib/queries');
      const emails = new Set(
        contacts.map((c: any) => (c.email || '').toLowerCase().trim()).filter(Boolean)
      );
      const ids = getContacts()
        .filter(c => emails.has(c.email.toLowerCase()))
        .map(c => c.id);
      if (ids.length) addContactsToList(listId, ids);
    }

    return NextResponse.json({ ...result, total: contacts.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
