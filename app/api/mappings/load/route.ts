import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Load existing property mappings for a table
 */
export async function GET(request: NextRequest) {
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

    const tableId = request.nextUrl.searchParams.get('tableId');

    if (!tableId) {
      return NextResponse.json({ error: 'tableId is required' }, { status: 400 });
    }

    // Get sync configs for this table
    const { data: syncConfigs, error: syncError } = await supabase
      .from('sync_configs')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_table_id', tableId)
      .eq('status', 'draft');

    if (syncError) {
      console.error('Error loading sync configs:', syncError);
      return NextResponse.json({ error: 'Failed to load sync configs' }, { status: 500 });
    }

    if (!syncConfigs || syncConfigs.length === 0) {
      return NextResponse.json({ success: true, mappings: [] });
    }

    const syncConfigIds = syncConfigs.map((sc) => sc.id);

    // Load mappings for all sync configs
    const { data: mappings, error: mappingsError } = await supabase
      .from('property_mappings')
      .select('*')
      .in('sync_config_id', syncConfigIds)
      .order('mapping_order', { ascending: true });

    if (mappingsError) {
      console.error('Error loading mappings:', mappingsError);
      return NextResponse.json({ error: 'Failed to load mappings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mappings: mappings || [],
    });
  } catch (err: any) {
    console.error('Load mappings API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to load mappings' },
      { status: 500 }
    );
  }
}
