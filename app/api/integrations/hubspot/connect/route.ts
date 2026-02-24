import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side endpoint to validate and connect HubSpot using personal access token
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { token } = await request.json();

    if (!token || !token.trim()) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Validate token by making API call server-side (no CORS issues)
    const testResponse = await fetch('https://api.hubapi.com/integrations/v1/me', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
      },
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      return NextResponse.json(
        { error: 'Invalid access token. Please check your token and try again.' },
        { status: 400 }
      );
    }

    const hubInfo = await testResponse.json();

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'hubspot')
      .eq('status', 'active')
      .single();

    const connectionData = {
      user_id: user.id,
      name: `Hubspot ${hubInfo.portalId || 'Production'}`,
      type: 'hubspot',
      status: 'active',
      host: 'api.hubapi.com',
      metadata: {
        access_token: token.trim(), // TODO: Encrypt this!
        hub_id: hubInfo.portalId,
        connected_at: new Date().toISOString(),
        is_private_app: true,
      },
    };

    let dbError;
    if (existingConnection) {
      // Update existing connection
      const { error } = await supabase
        .from('connections')
        .update(connectionData)
        .eq('id', existingConnection.id);
      dbError = error;
    } else {
      // Create new connection
      const { error } = await supabase.from('connections').insert(connectionData);
      dbError = error;
    }

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: {
        name: connectionData.name,
        hub_id: hubInfo.portalId,
      },
    });
  } catch (err: any) {
    console.error('HubSpot connect error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to connect HubSpot' },
      { status: 500 }
    );
  }
}
