-- ============================================================================
-- AUTH TRIGGER FOR AUTOMATIC PROFILE CREATION
-- Run this in Supabase SQL Editor AFTER schema.sql and rls_policies.sql
-- ============================================================================

-- This function creates a profile and user_stats record automatically
-- when a new user signs up through Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create the profile
    INSERT INTO public.profiles (id, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.email
    );

    -- Create initial user stats
    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ALTERNATIVE: If you want to pass display_name during signup, update the
-- signup call to include user metadata:
--
-- const { data, error } = await supabase.auth.signUp({
--   email,
--   password,
--   options: {
--     data: {
--       display_name: displayName,
--       hebrew_name: hebrewName,
--     }
--   }
-- })
-- ============================================================================
