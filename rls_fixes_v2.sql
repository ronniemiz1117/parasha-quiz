-- ============================================================================
-- RLS POLICY FIXES V2
-- Run this in Supabase SQL Editor to fix infinite recursion errors
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL PROBLEMATIC POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group admins can update memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group admins can delete memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON group_memberships;
DROP POLICY IF EXISTS "Users can insert own membership" ON group_memberships;
DROP POLICY IF EXISTS "Admins can manage memberships" ON group_memberships;

-- ============================================================================
-- STEP 2: CREATE SIMPLE NON-RECURSIVE POLICIES
-- ============================================================================

-- Policy 1: Users can ALWAYS view their OWN memberships (no recursion possible)
CREATE POLICY "Users can view own memberships" ON group_memberships
    FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Users can insert their own memberships (for joining groups)
CREATE POLICY "Users can insert own membership" ON group_memberships
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy 3: For viewing OTHER users' memberships in shared groups,
-- we use a security definer function to avoid recursion
-- First, create a helper function

CREATE OR REPLACE FUNCTION get_user_group_ids(p_user_id uuid)
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT group_id FROM group_memberships
    WHERE user_id = p_user_id AND is_active = true;
$$;

-- Policy 4: Users can view memberships of groups they belong to
-- This uses the security definer function to avoid recursion
CREATE POLICY "Users can view group members" ON group_memberships
    FOR SELECT USING (
        group_id IN (SELECT get_user_group_ids(auth.uid()))
    );

-- Policy 5: Admins can update memberships in their groups
CREATE POLICY "Admins can update memberships" ON group_memberships
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.group_id = group_memberships.group_id
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- Policy 6: Admins can delete memberships in their groups
CREATE POLICY "Admins can delete memberships" ON group_memberships
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.group_id = group_memberships.group_id
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- STEP 3: FIX GROUP INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Group admins can create invitations" ON group_invitations;
DROP POLICY IF EXISTS "Users can create invitations they own" ON group_invitations;

-- Simple policy: users can create invitations they own
CREATE POLICY "Users can create invitations" ON group_invitations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- STEP 4: FIX PROFILES (use security definer function)
-- ============================================================================

DROP POLICY IF EXISTS "Users can see group members profiles" ON profiles;

-- Users can view profiles of people in their groups
CREATE POLICY "Users can see group members profiles" ON profiles
    FOR SELECT USING (
        id = auth.uid()
        OR id IN (
            SELECT gm.user_id FROM group_memberships gm
            WHERE gm.group_id IN (SELECT get_user_group_ids(auth.uid()))
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- STEP 5: FIX USER STATS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view group member stats" ON user_stats;

CREATE POLICY "Users can view group member stats" ON user_stats
    FOR SELECT USING (
        user_id = auth.uid()
        OR user_id IN (
            SELECT gm.user_id FROM group_memberships gm
            WHERE gm.group_id IN (SELECT get_user_group_ids(auth.uid()))
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Policies updated successfully' as status;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('group_memberships', 'group_invitations', 'profiles', 'user_stats')
ORDER BY tablename, policyname;
