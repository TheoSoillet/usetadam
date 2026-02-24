import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Pool } from 'pg';

/**
 * Get columns from a specific table
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

    const { sourceTableId } = await request.json();

    if (!sourceTableId) {
      return NextResponse.json({ error: 'Source table ID is required' }, { status: 400 });
    }

    // Get source table details
    const { data: sourceTable, error: tableError } = await supabase
      .from('source_tables')
      .select('*, connections(*)')
      .eq('id', sourceTableId)
      .single();

    if (tableError || !sourceTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Verify user owns this table
    const connection = sourceTable.connections;
    if (!connection || connection.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get connection string from metadata or direct field
    let connectionString: string | null = null;
    
    // Check metadata field (JSONB)
    if (connection.metadata) {
      if (typeof connection.metadata === 'string') {
        try {
          const parsed = JSON.parse(connection.metadata);
          connectionString = parsed.connection_string || null;
        } catch (e) {
          console.error('Failed to parse metadata as JSON:', e);
        }
      } else if (typeof connection.metadata === 'object') {
        connectionString = (connection.metadata as any).connection_string || null;
      }
    }
    
    // Fallback to direct connection_string field
    if (!connectionString && connection.connection_string) {
      connectionString = connection.connection_string;
    }

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string not found. Please check your connection configuration.' },
        { status: 400 }
      );
    }

    // Parse connection string to extract individual components
    // Handle special characters in passwords (like @, !) by parsing manually
    let dbConfig: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      ssl?: any;
    };

    try {
      const connStr = connectionString.trim();
      
      // Match: postgresql://user:password@host:port/database
      // We need to find the LAST @ before the host (password may contain @)
      const protocolMatch = connStr.match(/^postgres(ql)?:\/\//);
      if (!protocolMatch) {
        throw new Error('Connection string must start with postgresql:// or postgres://');
      }

      // Find the last @ before the first / (which separates host:port from database)
      const atIndex = connStr.lastIndexOf('@');
      const slashIndex = connStr.indexOf('/', protocolMatch[0].length);
      
      if (atIndex === -1 || slashIndex === -1 || atIndex > slashIndex) {
        throw new Error('Invalid connection string format');
      }

      // Extract credentials (everything between :// and @)
      const credentialsPart = connStr.substring(protocolMatch[0].length, atIndex);
      const colonIndex = credentialsPart.indexOf(':');
      
      let user: string;
      let password: string;
      
      if (colonIndex === -1) {
        // No password, just username
        user = credentialsPart;
        password = '';
      } else {
        user = credentialsPart.substring(0, colonIndex);
        password = credentialsPart.substring(colonIndex + 1);
        // Decode URL-encoded characters in password
        password = decodeURIComponent(password);
      }

      // Extract host:port/database (everything after @)
      const hostPart = connStr.substring(atIndex + 1);
      const hostPortMatch = hostPart.match(/^([^:]+)(?::(\d+))?(\/.*)?$/);
      
      if (!hostPortMatch) {
        throw new Error('Invalid host format');
      }

      const host = hostPortMatch[1];
      const port = hostPortMatch[2] ? parseInt(hostPortMatch[2]) : 5432;
      const database = hostPortMatch[3] ? hostPortMatch[3].slice(1) : 'postgres'; // Remove leading /

      dbConfig = {
        host,
        port,
        database,
        user: decodeURIComponent(user),
        password,
        ssl: connection.ssl_enabled !== false ? { rejectUnauthorized: false } : false,
      };
    } catch (parseError: any) {
      console.error('Failed to parse connection string:', parseError);
      return NextResponse.json(
        { error: `Invalid connection string format: ${parseError.message}` },
        { status: 400 }
      );
    }

    // Connect to PostgreSQL using individual parameters (handles special chars in password)
    const pool = new Pool(dbConfig);

    try {
      const schema = sourceTable.schema_name || 'public';
      const tableName = sourceTable.table_name;

      const columnsQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position;
      `;

      const result = await pool.query(columnsQuery, [schema, tableName]);
      const columns = result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        max_length: row.character_maximum_length,
        precision: row.numeric_precision,
        scale: row.numeric_scale,
      }));

      await pool.end();

      return NextResponse.json({
        success: true,
        columns,
        table: {
          schema: schema,
          name: tableName,
        },
      });
    } catch (dbError: any) {
      await pool.end();
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: `Failed to fetch columns: ${dbError.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Get columns error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to get columns' },
      { status: 500 }
    );
  }
}
