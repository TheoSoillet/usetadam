import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Save a property mapping to the database
 * Creates a draft sync_config if one doesn't exist for the table
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

    const {
      tableId,
      sourceFieldName,
      sourceFieldType,
      destinationFieldName,
      destinationFieldType,
      isRequired,
      hubspotObjectType, // 'contacts', 'deals', or 'companies'
    } = await request.json();

    if (!tableId || !sourceFieldName || !destinationFieldName) {
      return NextResponse.json(
        { error: 'Missing required fields: tableId, sourceFieldName, destinationFieldName' },
        { status: 400 }
      );
    }

    // Get the source table to find/create sync config
    const { data: sourceTable, error: tableError } = await supabase
      .from('source_tables')
      .select('*, connections!inner(user_id)')
      .eq('id', tableId)
      .single();

    if (tableError || !sourceTable) {
      return NextResponse.json({ error: 'Source table not found' }, { status: 404 });
    }

    // Verify user owns this table
    if (sourceTable.connections.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get or create a draft sync_config for this table
    let syncConfigId: string;
    const objectType = hubspotObjectType || 'contacts'; // Default to contacts if not provided

    const { data: existingSyncConfig } = await supabase
      .from('sync_configs')
      .select('id, destination_config')
      .eq('user_id', user.id)
      .eq('source_table_id', tableId)
      .eq('status', 'draft')
      .single();

    if (existingSyncConfig) {
      syncConfigId = existingSyncConfig.id;
      
      // Update object_type if it's different (user switched object type)
      if (existingSyncConfig.destination_config?.object_type !== objectType) {
        const adminSupabase = getSupabaseAdmin();
        await adminSupabase
          .from('sync_configs')
          .update({
            destination_config: {
              ...existingSyncConfig.destination_config,
              object_type: objectType,
            },
          })
          .eq('id', syncConfigId);
      }
    } else {
      // Create a new draft sync_config
      const { data: newSyncConfig, error: createError } = await supabase
        .from('sync_configs')
        .insert({
          user_id: user.id,
          name: `Sync: ${sourceTable.display_name || sourceTable.table_name}`,
          source_table_id: tableId,
          destination_type: 'hubspot',
          destination_config: {
            object_type: objectType, // Use the provided object type
          },
          status: 'draft',
        })
        .select('id')
        .single();

      if (createError || !newSyncConfig) {
        console.error('Error creating sync_config:', createError);
        return NextResponse.json(
          { error: 'Failed to create sync configuration' },
          { status: 500 }
        );
      }

      syncConfigId = newSyncConfig.id;
    }

    // Use admin client to bypass RLS for upsert
    const adminSupabase = getSupabaseAdmin();

    // Upsert the mapping (update if exists, insert if not)
    const { data: mapping, error: mappingError } = await adminSupabase
      .from('property_mappings')
      .upsert(
        {
          sync_config_id: syncConfigId,
          source_field_name: sourceFieldName,
          source_field_type: sourceFieldType || 'unknown',
          destination_field_name: destinationFieldName,
          destination_field_type: destinationFieldType || 'string',
          is_required: isRequired || false,
          transformations: [],
          hubspot_object_type: objectType, // Store object type per mapping
        },
        {
          onConflict: 'sync_config_id,destination_field_name',
        }
      )
      .select()
      .single();

    if (mappingError) {
      console.error('Error saving mapping:', mappingError);
      return NextResponse.json(
        { error: 'Failed to save mapping' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mapping,
      syncConfigId,
    });
  } catch (err: any) {
    console.error('Save mapping API error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to save mapping' },
      { status: 500 }
    );
  }
}
