-- ============================================
-- Tadam Data Sync Planner - Supabase Schema
-- Multi-tenant application with plans & subscriptions
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- ============================================
-- 1. PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- 'free', 'pro', 'enterprise'
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
    price_yearly DECIMAL(10, 2),
    max_syncs INTEGER NOT NULL DEFAULT 1,
    max_rows_per_sync BIGINT,
    max_connections INTEGER NOT NULL DEFAULT 1,
    features JSONB DEFAULT '{}'::jsonb, -- {"real_time": false, "api_access": false, etc}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (name, display_name, description, price_monthly, price_yearly, max_syncs, max_rows_per_sync, max_connections, features) VALUES
('free', 'Free', 'Perfect for getting started', 0, 0, 3, 100000, 1, '{"real_time": false, "api_access": false, "support": "community"}'::jsonb),
('pro', 'Pro', 'For growing teams', 29, 290, 20, 10000000, 5, '{"real_time": true, "api_access": true, "support": "email"}'::jsonb),
('enterprise', 'Enterprise', 'For large organizations', 299, 2990, -1, -1, -1, '{"real_time": true, "api_access": true, "support": "priority", "sso": true, "custom_integrations": true}'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 2. USER PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email)
);

-- ============================================
-- 3. SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id) -- One active subscription per user
);

-- ============================================
-- 4. CONNECTIONS (Database connections)
-- ============================================
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'postgres', 'mysql', 'mongodb', 'snowflake', etc.
    host VARCHAR(255) NOT NULL,
    port INTEGER,
    database_name VARCHAR(255),
    username VARCHAR(255),
    password_encrypted TEXT, -- Encrypted password
    ssl_enabled BOOLEAN DEFAULT TRUE,
    connection_string TEXT, -- Alternative: full connection string
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'error'
    last_tested_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 5. TABLES (Source tables from connections)
-- ============================================
CREATE TABLE IF NOT EXISTS source_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    schema_name VARCHAR(255),
    table_name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    row_count BIGINT,
    last_updated_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'healthy', -- 'healthy', 'latency_risk', 'inaccessible'
    metadata JSONB DEFAULT '{}'::jsonb,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(connection_id, schema_name, table_name)
);

-- ============================================
-- 6. SYNC CONFIGURATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS sync_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_table_id UUID NOT NULL REFERENCES source_tables(id) ON DELETE CASCADE,
    destination_type VARCHAR(50) NOT NULL, -- 'warehouse', 'api', 'webhook', etc.
    destination_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- {type: "snowflake", connection: {...}}
    
    -- Schedule configuration
    frequency VARCHAR(20) NOT NULL DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly', 'custom_cron'
    execution_time TIME,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    cron_expression VARCHAR(255), -- For custom schedules
    
    -- Sync mode
    sync_mode VARCHAR(20) NOT NULL DEFAULT 'incremental', -- 'incremental', 'full_overwrite'
    cursor_field VARCHAR(255), -- Field used for incremental syncs
    
    -- Error handling
    retry_enabled BOOLEAN DEFAULT TRUE,
    max_retry_attempts INTEGER DEFAULT 3,
    pause_on_schema_change BOOLEAN DEFAULT FALSE,
    failure_notification VARCHAR(50) DEFAULT 'email', -- 'email', 'slack', 'silent'
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'error'
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 7. PROPERTY MAPPINGS
-- ============================================
CREATE TABLE IF NOT EXISTS property_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_config_id UUID NOT NULL REFERENCES sync_configs(id) ON DELETE CASCADE,
    source_field_name VARCHAR(255) NOT NULL,
    source_field_type VARCHAR(50) NOT NULL,
    destination_field_name VARCHAR(255) NOT NULL,
    destination_field_type VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT FALSE,
    transformations JSONB DEFAULT '[]'::jsonb, -- [{"type": "trim", "params": {}}, {"type": "title_case"}]
    mapping_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(sync_config_id, destination_field_name)
);

-- ============================================
-- 8. SYNC EXECUTIONS (History)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_config_id UUID NOT NULL REFERENCES sync_configs(id) ON DELETE CASCADE,
    execution_id VARCHAR(100) NOT NULL UNIQUE, -- Human-readable ID like SYNC-2023-1024-001
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped', 'running'
    rows_processed BIGINT DEFAULT 0,
    rows_total BIGINT,
    duration_seconds DECIMAL(10, 2),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_code VARCHAR(50),
    error_message TEXT,
    retry_attempt INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 9. SYNC EXECUTION LOGS (Detailed logs)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES sync_executions(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'debug'
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- 10. USAGE METRICS (For billing/limits)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    syncs_run INTEGER DEFAULT 0,
    rows_synced BIGINT DEFAULT 0,
    api_calls INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, metric_date)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_source_tables_connection_id ON source_tables(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_configs_user_id ON sync_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_configs_status ON sync_configs(status);
CREATE INDEX IF NOT EXISTS idx_sync_configs_next_run_at ON sync_configs(next_run_at);
CREATE INDEX IF NOT EXISTS idx_property_mappings_sync_config_id ON property_mappings(sync_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_executions_sync_config_id ON sync_executions(sync_config_id);
CREATE INDEX IF NOT EXISTS idx_sync_executions_status ON sync_executions(status);
CREATE INDEX IF NOT EXISTS idx_sync_executions_started_at ON sync_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_execution_logs_execution_id ON sync_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_user_id_date ON usage_metrics(user_id, metric_date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Subscriptions: Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Connections: Users can manage their own connections
CREATE POLICY "Users can view own connections" ON connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections" ON connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections" ON connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections" ON connections
    FOR DELETE USING (auth.uid() = user_id);

-- Source Tables: Users can view tables from their connections
CREATE POLICY "Users can view own source tables" ON source_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM connections
            WHERE connections.id = source_tables.connection_id
            AND connections.user_id = auth.uid()
        )
    );

-- Sync Configs: Users can manage their own sync configs
CREATE POLICY "Users can view own sync configs" ON sync_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync configs" ON sync_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync configs" ON sync_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync configs" ON sync_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Property Mappings: Users can manage mappings for their sync configs
CREATE POLICY "Users can view own property mappings" ON property_mappings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = property_mappings.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own property mappings" ON property_mappings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = property_mappings.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own property mappings" ON property_mappings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = property_mappings.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own property mappings" ON property_mappings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = property_mappings.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

-- Sync Executions: Users can view executions for their sync configs
CREATE POLICY "Users can view own sync executions" ON sync_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = sync_executions.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own sync executions" ON sync_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sync_configs
            WHERE sync_configs.id = sync_executions.sync_config_id
            AND sync_configs.user_id = auth.uid()
        )
    );

-- Sync Execution Logs: Users can view logs for their executions
CREATE POLICY "Users can view own execution logs" ON sync_execution_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sync_executions
            JOIN sync_configs ON sync_configs.id = sync_executions.sync_config_id
            WHERE sync_execution_logs.execution_id = sync_executions.id
            AND sync_configs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own execution logs" ON sync_execution_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sync_executions
            JOIN sync_configs ON sync_configs.id = sync_executions.sync_config_id
            WHERE sync_execution_logs.execution_id = sync_executions.id
            AND sync_configs.user_id = auth.uid()
        )
    );

-- Usage Metrics: Users can view their own metrics
CREATE POLICY "Users can view own usage metrics" ON usage_metrics
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage metrics" ON usage_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_tables_updated_at BEFORE UPDATE ON source_tables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_configs_updated_at BEFORE UPDATE ON sync_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_mappings_updated_at BEFORE UPDATE ON property_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Create free subscription for new user
    INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
    VALUES (
        NEW.id,
        (SELECT id FROM plans WHERE name = 'free' LIMIT 1),
        'active',
        NOW(),
        NOW() + INTERVAL '1 month'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate execution IDs
CREATE OR REPLACE FUNCTION generate_execution_id()
RETURNS TEXT AS $$
DECLARE
    date_part TEXT;
    sequence_num INTEGER;
BEGIN
    date_part := TO_CHAR(NOW(), 'YYYY-MMDD');
    SELECT COALESCE(MAX(CAST(SUBSTRING(execution_id FROM 'SYNC-\d{4}-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM sync_executions
    WHERE execution_id LIKE 'SYNC-' || date_part || '-%';
    
    RETURN 'SYNC-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View for user sync stats
CREATE OR REPLACE VIEW user_sync_stats AS
SELECT 
    u.id as user_id,
    COUNT(DISTINCT sc.id) as total_syncs,
    COUNT(DISTINCT c.id) as total_connections,
    COUNT(DISTINCT se.id) FILTER (WHERE se.status = 'success') as successful_executions,
    COUNT(DISTINCT se.id) FILTER (WHERE se.status = 'failed') as failed_executions,
    COALESCE(SUM(se.rows_processed), 0) as total_rows_synced,
    COALESCE(AVG(se.duration_seconds), 0) as avg_duration_seconds
FROM auth.users u
LEFT JOIN sync_configs sc ON sc.user_id = u.id
LEFT JOIN connections c ON c.user_id = u.id
LEFT JOIN sync_executions se ON se.sync_config_id = sc.id
GROUP BY u.id;

-- View for active subscriptions with plan details
CREATE OR REPLACE VIEW active_subscriptions_view AS
SELECT 
    s.*,
    p.name as plan_name,
    p.display_name as plan_display_name,
    p.max_syncs,
    p.max_rows_per_sync,
    p.max_connections,
    p.features
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE s.status = 'active';
