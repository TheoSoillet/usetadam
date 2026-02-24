import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Delete a property mapping
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options);
          },
          remove(name: string, options: any) {
            cookieStore.delete(name);
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { tableId, sourceFieldName } = await request.json();

    if (!tableId || !sourceFieldName) {
      return NextResponse.json(
        { error: 'Missing required fields: tableId, sourceFieldName' },
        { status: 400 }
      );
    }

    // Get sync configs for this table
    const { data: syncConfigs } = await supabase
      .from('sync_configs')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_table_id', tableId)
      .eq('status', 'draft');

    if (!syncConfigs || syncConfigs.length === 0) {
      return NextResponse.json({ success: true, message: 'No mappings to delete' });
    }

    const syncConfigIds = syncConfigs.map((sc) => sc.id);

    // Use admin client to bypass RLS
    const adminSupabase = getSupabaseAdmin();

    // Delete the mapping
    const { error: deleteError } = await adminSupabase
      .from('property_mappings')
      .delete()
      .in('sync_config_id', syncConfigIds)
      .eq('source_field_name', sourceFieldName);

    if (deleteError) {
      console.error('Error deleting mapping:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mapping deleted successfully',
    });
  } catch (err: any) {
    console.error('Delete mapping API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to delete mapping' },
      { status: 500 }
    );
  }
}
