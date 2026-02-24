-- Add INSERT policy for source_tables
-- Users can insert tables for their own connections

CREATE POLICY "Users can insert own source tables" ON source_tables
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM connections
            WHERE connections.id = source_tables.connection_id
            AND connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own source tables" ON source_tables
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM connections
            WHERE connections.id = source_tables.connection_id
            AND connections.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own source tables" ON source_tables
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM connections
            WHERE connections.id = source_tables.connection_id
            AND connections.user_id = auth.uid()
        )
    );
