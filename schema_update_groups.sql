-- ============================================================================
-- SCHEMA UPDATE: Quiz-to-Group Assignments
-- Run this in Supabase SQL Editor to add group-scoped quizzes
-- ============================================================================

-- Junction table: assign quizzes to groups
-- A quiz can be assigned to multiple groups
-- A group can have multiple quizzes
CREATE TABLE IF NOT EXISTS quiz_group_assignments (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    -- Optional: override quiz settings per group
    available_from TIMESTAMPTZ,      -- NULL = use quiz default
    available_until TIMESTAMPTZ,     -- NULL = use quiz default
    UNIQUE(quiz_id, group_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_quiz_group_assignments_quiz ON quiz_group_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_group_assignments_group ON quiz_group_assignments(group_id);

-- ============================================================================
-- RLS POLICIES FOR quiz_group_assignments
-- ============================================================================

ALTER TABLE quiz_group_assignments ENABLE ROW LEVEL SECURITY;

-- Users can see quiz assignments for groups they belong to
CREATE POLICY "Users can view quiz assignments for their groups" ON quiz_group_assignments
    FOR SELECT USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid() AND gm.is_active = true
        )
    );

-- Admins/teachers can assign quizzes to groups they manage
CREATE POLICY "Admins can create quiz assignments" ON quiz_group_assignments
    FOR INSERT WITH CHECK (
        assigned_by = auth.uid()
        AND group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- Admins/teachers can update quiz assignments for groups they manage
CREATE POLICY "Admins can update quiz assignments" ON quiz_group_assignments
    FOR UPDATE USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- Admins/teachers can delete quiz assignments for groups they manage
CREATE POLICY "Admins can delete quiz assignments" ON quiz_group_assignments
    FOR DELETE USING (
        group_id IN (
            SELECT gm.group_id FROM group_memberships gm
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- UPDATE QUIZZES RLS - Allow admins to see quizzes they created
-- ============================================================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Anyone can view published quizzes" ON quizzes;

-- Admins/teachers can see their own quizzes (created_by)
CREATE POLICY "Creators can view their quizzes" ON quizzes
    FOR SELECT USING (created_by = auth.uid());

-- Users can see published quizzes assigned to their groups
CREATE POLICY "Users can view quizzes assigned to their groups" ON quizzes
    FOR SELECT USING (
        is_published = true
        AND id IN (
            SELECT qga.quiz_id FROM quiz_group_assignments qga
            WHERE qga.is_active = true
            AND qga.group_id IN (
                SELECT gm.group_id FROM group_memberships gm
                WHERE gm.user_id = auth.uid() AND gm.is_active = true
            )
        )
    );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'quiz_group_assignments table created' as status;

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'quiz_group_assignments'
ORDER BY policyname;
