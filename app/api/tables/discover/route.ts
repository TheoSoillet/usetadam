import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Pool } from 'pg';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * Discover tables from a database connection
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

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
    }

    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connError) {
      console.error('Connection fetch error:', connError);
      return NextResponse.json(
        { error: `Connection fetch failed: ${connError.message}` },
        { status: 404 }
      );
    }

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (connection.type !== 'postgresql') {
      return NextResponse.json(
        { error: 'Only PostgreSQL connections are supported' },
        { status: 400 }
      );
    }

    // Get connection string from metadata or direct field
    // metadata is JSONB, so it should already be parsed as an object
    let connectionString: string | null = null;
    
    // Check metadata field (JSONB)
    if (connection.metadata) {
      if (typeof connection.metadata === 'string') {
        // If it's a string, try to parse it
        try {
          const parsed = JSON.parse(connection.metadata);
          connectionString = parsed.connection_string || null;
        } catch (e) {
          console.error('Failed to parse metadata as JSON:', e);
        }
      } else if (typeof connection.metadata === 'object') {
        // Already an object
        connectionString = (connection.metadata as any).connection_string || null;
      }
    }
    
    // Fallback to direct connection_string field
    if (!connectionString && connection.connection_string) {
      connectionString = connection.connection_string;
    }
    
    if (!connectionString) {
      console.error('Connection string not found. Connection data:', {
        id: connection.id,
        type: connection.type,
        hasMetadata: !!connection.metadata,
        metadataType: typeof connection.metadata,
        metadataValue: connection.metadata,
        hasDirectField: !!connection.connection_string,
      });
      return NextResponse.json(
        { error: 'Connection string not found in connection metadata. Please reconnect your database.' },
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

      console.log('Database config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        passwordLength: dbConfig.password.length,
        ssl: !!dbConfig.ssl,
      });
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
      // Test connection first
      const testResult = await pool.query('SELECT NOW(), current_database(), current_user');
      console.log('Database connection successful:', {
        time: testResult.rows[0].now,
        database: testResult.rows[0].current_database,
        user: testResult.rows[0].current_user,
      });

      // Use pg_tables (same as \dt in psql) - more reliable
      // Filter out system schemas - only show user tables (public schema and custom schemas)
      const tablesQuery = `
        SELECT 
          schemaname as table_schema,
          tablename as table_name,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_schema = schemaname AND table_name = tablename) as column_count
        FROM pg_tables
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'auth', 'realtime', 'storage', 'vault', 'extensions')
        ORDER BY schemaname, tablename;
      `;

      let result;
      try {
        result = await pool.query(tablesQuery);
        console.log(`pg_tables query found ${result.rows.length} tables:`, result.rows);
      } catch (queryError: any) {
        console.log('pg_tables query failed, trying information_schema:', queryError.message);
        // Fallback to information_schema
        const altQuery = `
          SELECT 
            table_schema,
            table_name,
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
          FROM information_schema.tables t
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name;
        `;
        result = await pool.query(altQuery);
        console.log(`information_schema query found ${result.rows.length} tables:`, result.rows);
      }
      
      if (result.rows.length === 0) {
        // Try alternative query using information_schema
        console.log('No tables found with pg_tables, trying information_schema...');
        const altQuery = `
          SELECT 
            table_schema,
            table_name,
            (SELECT COUNT(*) FROM information_schema.columns 
             WHERE table_schema = t.table_schema AND table_name = t.table_name) as column_count
          FROM information_schema.tables t
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_schema, table_name;
        `;
        const altResult = await pool.query(altQuery);
        console.log(`Alternative query found ${altResult.rows.length} tables:`, altResult.rows);
        
        const tables = altResult.rows.map((row) => ({
          schema: row.table_schema,
          name: row.table_name,
          column_count: parseInt(row.column_count),
        }));
        
        // Store discovered tables
        const tablesToInsert = tables.map((table) => ({
          connection_id: connectionId,
          schema_name: table.schema,
          table_name: table.name,
          display_name: table.name,
          row_count: null,
          status: 'healthy',
          metadata: {
            column_count: table.column_count,
            discovered_at: new Date().toISOString(),
          },
        }));

        // Use admin client to bypass RLS for inserts
        const adminSupabase = getSupabaseAdmin();
        for (const table of tablesToInsert) {
          const { error } = await adminSupabase.from('source_tables').upsert(table, {
            onConflict: 'connection_id,schema_name,table_name',
          });
          if (error) {
            console.error(`Error upserting table ${table.schema_name}.${table.table_name}:`, error);
          }
        }

        await pool.end();

        return NextResponse.json({
          success: true,
          tables: tables.map((t) => ({
            schema: t.schema,
            name: t.name,
            column_count: t.column_count,
          })),
        });
      }
      
      const tables = result.rows.map((row) => ({
        schema: row.table_schema,
        name: row.table_name,
        column_count: parseInt(row.column_count),
      }));

      // Store discovered tables in source_tables
      const tablesToInsert = tables.map((table) => ({
        connection_id: connectionId,
        schema_name: table.schema,
        table_name: table.name,
        display_name: table.name,
        row_count: null, // Will be updated later
        status: 'healthy',
        metadata: {
          column_count: table.column_count,
          discovered_at: new Date().toISOString(),
        },
      }));

      // Insert tables using admin client to bypass RLS
      // We've already verified the user owns the connection, so this is safe
      const adminSupabase = getSupabaseAdmin();
      const insertResults = [];
      
      for (const table of tablesToInsert) {
        const { data, error } = await adminSupabase.from('source_tables').upsert(table, {
          onConflict: 'connection_id,schema_name,table_name',
        }).select();
        
        if (error) {
          console.error(`Error upserting table ${table.schema_name}.${table.table_name}:`, error);
        } else {
          insertResults.push(data);
        }
      }
      
      console.log(`Stored ${insertResults.length} tables in source_tables`);

      await pool.end();

      return NextResponse.json({
        success: true,
        tables: tables.map((t) => ({
          schema: t.schema,
          name: t.name,
          column_count: t.column_count,
        })),
      });
    } catch (dbError: any) {
      await pool.end();
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: `Failed to fetch tables: ${dbError.message}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Discover tables error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to discover tables' },
      { status: 500 }
    );
  }
}
