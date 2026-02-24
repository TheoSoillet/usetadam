# Sync Function Requirements

## Overview
This document outlines what information is available for a sync function to execute data synchronization from PostgreSQL tables to HubSpot.

## Database Schema

### Available Information

#### 1. Sync Configuration (`sync_configs`)
```sql
SELECT 
  id,
  user_id,
  source_table_id,
  destination_type, -- 'hubspot'
  destination_config, -- JSONB: { "object_type": "contacts" | "deals" | "companies" }
  sync_mode, -- 'incremental' | 'full_overwrite'
  cursor_field, -- Field for incremental syncs
  status -- 'draft' | 'active' | 'paused' | 'error'
FROM sync_configs
WHERE id = :sync_config_id;
```

**Key Fields:**
- `destination_config->>'object_type'`: The HubSpot object type ('contacts', 'deals', or 'companies')
- `source_table_id`: Links to the source table

#### 2. Source Table (`source_tables`)
```sql
SELECT 
  id,
  connection_id,
  schema_name,
  table_name,
  display_name
FROM source_tables
WHERE id = :source_table_id;
```

#### 3. Source Database Connection (`connections`)
```sql
SELECT 
  id,
  type, -- 'postgresql'
  connection_string, -- Full PostgreSQL connection string
  metadata -- JSONB with connection details
FROM connections
WHERE id = :connection_id;
```

**Connection String Format:**
```
postgresql://user:password@host:port/database
```

#### 4. HubSpot Connection (`connections`)
```sql
SELECT 
  id,
  type, -- 'hubspot'
  metadata->>'access_token' as access_token, -- HubSpot personal access token
  metadata->>'hub_id' as hub_id -- HubSpot portal ID
FROM connections
WHERE user_id = :user_id AND type = 'hubspot' AND status = 'active';
```

#### 5. Property Mappings (`property_mappings`)
```sql
SELECT 
  source_field_name, -- Column name in source table
  source_field_type, -- PostgreSQL data type
  destination_field_name, -- HubSpot property name
  destination_field_type, -- HubSpot property type
  hubspot_object_type, -- 'contacts', 'deals', or 'companies' - NEW!
  is_required,
  transformations -- JSONB array of transformation rules
FROM property_mappings
WHERE sync_config_id = :sync_config_id
ORDER BY mapping_order;
```

**Important:** Each mapping can target a different HubSpot object type. This allows mapping fields from the same source table to different HubSpot objects (e.g., some fields to Contacts, others to Deals).

## Sync Function Flow

### Step 1: Get Sync Configuration
```sql
SELECT sc.*, st.*, c.*
FROM sync_configs sc
JOIN source_tables st ON st.id = sc.source_table_id
JOIN connections c ON c.id = st.connection_id
WHERE sc.id = :sync_config_id
  AND sc.status = 'active';
```

### Step 2: Get HubSpot Connection
```sql
SELECT metadata->>'access_token' as access_token
FROM connections
WHERE user_id = :user_id
  AND type = 'hubspot'
  AND status = 'active'
LIMIT 1;
```

### Step 3: Get Property Mappings
```sql
SELECT *
FROM property_mappings
WHERE sync_config_id = :sync_config_id
ORDER BY mapping_order;
```

### Step 4: Group Mappings by HubSpot Object Type
```javascript
// Group mappings by HubSpot object type since each mapping can target different objects
const mappingsByObjectType = {};
mappings.forEach(mapping => {
  const objectType = mapping.hubspot_object_type || 'contacts';
  if (!mappingsByObjectType[objectType]) {
    mappingsByObjectType[objectType] = [];
  }
  mappingsByObjectType[objectType].push(mapping);
});

// Process each object type separately
Object.keys(mappingsByObjectType).forEach(objectType => {
  const objectMappings = mappingsByObjectType[objectType];
  // Sync this group of mappings to the specified HubSpot object type
});
```

### Step 5: Query Source Database
```sql
-- Example: Query the source table
SELECT 
  {source_field_name_1},
  {source_field_name_2},
  ...
FROM {schema_name}.{table_name}
WHERE {cursor_field} > :last_sync_cursor -- If incremental sync
ORDER BY {cursor_field}
LIMIT :batch_size;
```

### Step 6: Transform Data
Apply transformations from `property_mappings.transformations` array:
- `trim`: Remove whitespace
- `title_case`: Convert to title case
- `lowercase`: Convert to lowercase
- `uppercase`: Convert to uppercase
- Custom transformations

### Step 7: Map to HubSpot Format (Grouped by Object Type)
```javascript
// Group records by HubSpot object type
const recordsByObjectType = {};

mappings.forEach(mapping => {
  const objectType = mapping.hubspot_object_type || 'contacts';
  if (!recordsByObjectType[objectType]) {
    recordsByObjectType[objectType] = {};
  }
  
  const sourceValue = sourceRow[mapping.source_field_name];
  let transformedValue = applyTransformations(sourceValue, mapping.transformations);
  recordsByObjectType[objectType][mapping.destination_field_name] = transformedValue;
});
```

### Step 8: Create/Update HubSpot Records (One per Object Type)
```javascript
// Process each HubSpot object type separately
for (const [objectType, hubspotRecord] of Object.entries(recordsByObjectType)) {
  const endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}/batch/create`;
  // or for updates:
  // const endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}/batch/update`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hubspotAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [hubspotRecord]
    })
  });
  
  // Handle response and errors per object type
}
```

## Example: Complete Sync Function Query

```sql
-- Get all information needed for sync
-- Note: Each mapping can have a different hubspot_object_type
WITH sync_info AS (
  SELECT 
    sc.id as sync_config_id,
    sc.user_id,
    sc.sync_mode,
    sc.cursor_field,
    st.schema_name,
    st.table_name,
    st.connection_id as source_connection_id,
    src_conn.connection_string as source_connection_string,
    hubspot_conn.metadata->>'access_token' as hubspot_access_token
  FROM sync_configs sc
  JOIN source_tables st ON st.id = sc.source_table_id
  JOIN connections src_conn ON src_conn.id = st.connection_id
  JOIN connections hubspot_conn ON hubspot_conn.user_id = sc.user_id 
    AND hubspot_conn.type = 'hubspot' 
    AND hubspot_conn.status = 'active'
  WHERE sc.id = :sync_config_id
    AND sc.status = 'active'
)
SELECT 
  si.*,
  json_agg(
    json_build_object(
      'source_field_name', pm.source_field_name,
      'source_field_type', pm.source_field_type,
      'destination_field_name', pm.destination_field_name,
      'destination_field_type', pm.destination_field_type,
      'hubspot_object_type', pm.hubspot_object_type, -- Each mapping has its own object type!
      'is_required', pm.is_required,
      'transformations', pm.transformations
    ) ORDER BY pm.mapping_order
  ) as mappings
FROM sync_info si
JOIN property_mappings pm ON pm.sync_config_id = si.sync_config_id
GROUP BY si.sync_config_id, si.user_id, si.sync_mode, si.cursor_field, 
         si.schema_name, si.table_name, si.source_connection_id, 
         si.source_connection_string, si.hubspot_access_token;
```

## Schema Information

The schema provides all necessary information:
- ✅ HubSpot object type per mapping (stored in `property_mappings.hubspot_object_type`)
- ✅ Source database connection details
- ✅ HubSpot connection details (access token)
- ✅ Property mappings (each can target different HubSpot objects)
- ✅ Field transformations

**Note:** Each `property_mapping` has its own `hubspot_object_type`, allowing the same source table to sync different fields to different HubSpot object types (contacts, deals, companies).

## Notes

1. **Multi-tenancy**: All queries should filter by `user_id` to ensure data isolation
2. **RLS**: Row Level Security policies ensure users can only access their own data
3. **Incremental Syncs**: Use `cursor_field` to track last synced record
4. **Error Handling**: Store errors in `sync_executions` table
5. **Batch Processing**: Process records in batches to avoid API rate limits
