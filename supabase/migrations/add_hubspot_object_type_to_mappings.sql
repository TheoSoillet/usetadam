-- Add hubspot_object_type to property_mappings table
-- This allows each mapping to target a different HubSpot object type (contacts, deals, companies)
-- even if they come from the same source table

ALTER TABLE property_mappings 
ADD COLUMN IF NOT EXISTS hubspot_object_type VARCHAR(50) DEFAULT 'contacts';

-- Add a comment explaining the field
COMMENT ON COLUMN property_mappings.hubspot_object_type IS 
  'The HubSpot object type this mapping targets: contacts, deals, or companies';

-- Update existing mappings to have a default value if they don't have one
-- (This will use the sync_config destination_config if available, otherwise default to contacts)
UPDATE property_mappings pm
SET hubspot_object_type = COALESCE(
  (SELECT sc.destination_config->>'object_type' 
   FROM sync_configs sc 
   WHERE sc.id = pm.sync_config_id),
  'contacts'
)
WHERE hubspot_object_type IS NULL OR hubspot_object_type = 'contacts';

-- Add a check constraint to ensure valid values
ALTER TABLE property_mappings
ADD CONSTRAINT check_hubspot_object_type 
CHECK (hubspot_object_type IN ('contacts', 'deals', 'companies'));

-- Create an index for faster queries by object type
CREATE INDEX IF NOT EXISTS idx_property_mappings_hubspot_object_type 
ON property_mappings(hubspot_object_type);
