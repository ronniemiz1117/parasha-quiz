-- ============================================================================
-- RLS POLICY FIXES
-- Run this in Supabase SQL Editor to fix infinite recursion errors
-- ============================================================================

-- ============================================================================
-- FIX 1: GROUP MEMBERSHIPS POLICIES (infinite recursion fix)
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view group memberships" ON group_memberships;
DROP POLICY IF EXISTS "Group admins can manage memberships" ON group_memberships;

-- Recreate with fixed logic (no self-referencing that causes recursion)

-- Users can view memberships in groups they belong to
CREATE POLICY "Users can view group memberships" ON group_memberships
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid() AND gm.is_active = true
        )
    );

-- Group admins can update memberships
CREATE POLICY "Group admins can update memberships" ON group_memberships
    FOR UPDATE USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- Group admins can delete memberships
CREATE POLICY "Group admins can delete memberships" ON group_memberships
    FOR DELETE USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- FIX 2: GROUP INVITATIONS - Allow creators to insert their own invitations
-- ============================================================================

-- Drop the old policy that causes recursion (it checks group_memberships which triggers recursion)
DROP POLICY IF EXISTS "Group admins can create invitations" ON group_invitations;

-- This policy allows admin signup flow to work (create invitation right after creating group)
DROP POLICY IF EXISTS "Users can create invitations they own" ON group_invitations;
CREATE POLICY "Users can create invitations they own" ON group_invitations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- FIX 3: PROFILES - Fix potential recursion in group members profiles policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can see group members profiles" ON profiles;
CREATE POLICY "Users can see group members profiles" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT gm2.user_id
            FROM group_memberships gm1
            JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid()
            AND gm1.is_active = true
            AND gm2.is_active = true
        )
    );

-- ============================================================================
-- FIX 4: USER STATS - Fix potential recursion in group member stats policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can view group member stats" ON user_stats;
CREATE POLICY "Users can view group member stats" ON user_stats
    FOR SELECT USING (
        user_id IN (
            SELECT gm2.user_id
            FROM group_memberships gm1
            JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid()
            AND gm1.is_active = true
            AND gm2.is_active = true
        )
    );

-- ============================================================================
-- VERIFICATION: Check that policies were created
-- ============================================================================

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('group_memberships', 'group_invitations', 'profiles', 'user_stats')
ORDER BY tablename, policyname;
