import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Get HubSpot properties for mapping
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

    const objectType = request.nextUrl.searchParams.get('objectType') || 'contacts';

    // Get HubSpot connection
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'hubspot')
      .eq('status', 'active')
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'HubSpot connection not found. Please connect HubSpot first.' },
        { status: 404 }
      );
    }

    const accessToken = connection.metadata?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'HubSpot access token not found' },
        { status: 400 }
      );
    }

    // Fetch properties from HubSpot API
    const propertiesResponse = await fetch(
      `https://api.hubapi.com/crm/v3/properties/${objectType}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!propertiesResponse.ok) {
      const errorText = await propertiesResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch HubSpot properties: ${errorText}` },
        { status: propertiesResponse.status }
      );
    }

    const data = await propertiesResponse.json();
    const properties = data.results || [];

    // Format properties for display
    const formattedProperties = properties.map((prop: any) => ({
      name: prop.name,
      label: prop.label,
      type: prop.type,
      fieldType: prop.fieldType,
      description: prop.description,
      required: prop.required || false,
      readOnly: prop.readOnlyValue || false,
      options: prop.options || [],
    }));

    return NextResponse.json({
      success: true,
      properties: formattedProperties,
      objectType,
    });
  } catch (err: any) {
    console.error('Get HubSpot properties error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get HubSpot properties' },
      { status: 500 }
    );
  }
}
