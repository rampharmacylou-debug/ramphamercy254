import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import Papa from 'papaparse';

export async function POST() {
  try {
    const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;

    if (!csvUrl) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEET_CSV_URL is missing in environment variables.' },
        { status: 500 }
      );
    }

    // 1. Fetch live CSV text from Google Sheets
    const response = await fetch(csvUrl, { cache: 'no-store' });
    const csvText = await response.text();

    // 2. Parse CSV into JSON
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV Warnings:', parsed.errors);
    }

    // 3. Map rows to match your Supabase columns
    const rowsToUpsert = parsed.data
      .map((row: any) => ({
        product: row.product?.trim(),
        pack_size: row.pack_size?.trim(),
        unit_price: row.unit_price ? parseFloat(row.unit_price) : null,
        box_price: row.box_price ? parseFloat(row.box_price) : null,
      }))
      .filter((item: any) => item.product); // Ignore empty product rows

    if (rowsToUpsert.length === 0) {
      return NextResponse.json(
        { message: 'No valid product records found in the Google Sheet.' },
        { status: 400 }
      );
    }

    // 4. Clear old data and insert fresh records
    const { error: deleteError } = await supabase
      .from('pharmacy_prices')
      .delete()
      .neq('id', 0);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('pharmacy_prices')
      .insert(rowsToUpsert);

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${rowsToUpsert.length} items from Google Sheets!`,
    });
  } catch (err: any) {
    console.error('Sync Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sync Google Sheets data.' },
      { status: 500 }
    );
  }
}

