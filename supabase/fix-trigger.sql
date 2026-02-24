-- Fix for handle_new_user trigger
-- Run this in Supabase SQL Editor if you're getting "Database error saving new user"

-- Drop and recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    free_plan_id UUID;
BEGIN
    -- Get the free plan ID
    SELECT id INTO free_plan_id FROM plans WHERE name = 'free' LIMIT 1;
    
    -- If no free plan exists, skip subscription creation
    IF free_plan_id IS NULL THEN
        RAISE WARNING 'Free plan not found, skipping subscription creation';
    END IF;
    
    -- Create user profile (ignore if already exists)
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create free subscription if plan exists
    IF free_plan_id IS NOT NULL THEN
        INSERT INTO public.subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
        VALUES (
            NEW.id,
            free_plan_id,
            'active',
            NOW(),
            NOW() + INTERVAL '1 month'
        )
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
