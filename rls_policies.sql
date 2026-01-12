-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE parshiyot ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliyot ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can see profiles of people in their groups (for leaderboards)
CREATE POLICY "Users can see group members profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm1
            JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid()
            AND gm2.user_id = profiles.id
            AND gm1.is_active = true
            AND gm2.is_active = true
        )
    );

-- ============================================================================
-- GROUPS POLICIES
-- ============================================================================

-- Anyone can view active groups
CREATE POLICY "Anyone can view groups" ON groups
    FOR SELECT USING (is_active = true);

-- Authenticated users can create groups (for admin signup)
CREATE POLICY "Authenticated users can create groups" ON groups
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Group admins can update their groups
CREATE POLICY "Group admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = groups.id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- GROUP MEMBERSHIPS POLICIES
-- ============================================================================

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships" ON group_memberships
    FOR SELECT USING (user_id = auth.uid());

-- Users can view memberships in their groups (for leaderboards)
CREATE POLICY "Users can view group memberships" ON group_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_memberships.group_id
            AND gm.user_id = auth.uid()
            AND gm.is_active = true
        )
    );

-- Users can join groups (insert their own membership)
CREATE POLICY "Users can join groups" ON group_memberships
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Group admins can manage memberships
CREATE POLICY "Group admins can manage memberships" ON group_memberships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_memberships.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- GROUP INVITATIONS POLICIES
-- ============================================================================

-- Anyone can check if an invite code is valid (for joining)
CREATE POLICY "Anyone can read active invitations" ON group_invitations
    FOR SELECT USING (is_active = true);

-- Group admins/teachers can create invitations
CREATE POLICY "Group admins can create invitations" ON group_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_invitations.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- Group admins/teachers can update invitations
CREATE POLICY "Group admins can update invitations" ON group_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_invitations.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );

-- ============================================================================
-- INVITATION USES POLICIES
-- ============================================================================

-- Users can log their own invitation use
CREATE POLICY "Users can log invitation use" ON invitation_uses
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view their own invitation uses
CREATE POLICY "Users can view own invitation uses" ON invitation_uses
    FOR SELECT USING (user_id = auth.uid());

-- ============================================================================
-- PARSHIYOT & ALIYOT POLICIES (Public Read)
-- ============================================================================

CREATE POLICY "Public read access to parshiyot" ON parshiyot
    FOR SELECT USING (true);

CREATE POLICY "Public read access to aliyot" ON aliyot
    FOR SELECT USING (true);

-- ============================================================================
-- QUIZZES POLICIES
-- ============================================================================

-- Anyone can view published quizzes
CREATE POLICY "Anyone can read published quizzes" ON quizzes
    FOR SELECT USING (is_published = true);

-- Quiz creators can manage their quizzes
CREATE POLICY "Quiz creators can manage quizzes" ON quizzes
    FOR ALL USING (created_by = auth.uid());

-- ============================================================================
-- QUESTIONS POLICIES
-- ============================================================================

-- Questions are readable for published quizzes
CREATE POLICY "Public read questions for published quizzes" ON questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quizzes q
            WHERE q.id = questions.quiz_id
            AND q.is_published = true
        )
    );

-- Quiz creators can manage questions
CREATE POLICY "Quiz creators can manage questions" ON questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM quizzes q
            WHERE q.id = questions.quiz_id
            AND q.created_by = auth.uid()
        )
    );

-- ============================================================================
-- ANSWER CHOICES POLICIES
-- ============================================================================

-- Answer choices are readable for published quizzes
CREATE POLICY "Public read answer choices for published quizzes" ON answer_choices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM questions q
            JOIN quizzes quiz ON q.quiz_id = quiz.id
            WHERE q.id = answer_choices.question_id
            AND quiz.is_published = true
        )
    );

-- Quiz creators can manage answer choices
CREATE POLICY "Quiz creators can manage answer choices" ON answer_choices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM questions q
            JOIN quizzes quiz ON q.quiz_id = quiz.id
            WHERE q.id = answer_choices.question_id
            AND quiz.created_by = auth.uid()
        )
    );

-- ============================================================================
-- QUIZ ATTEMPTS POLICIES
-- ============================================================================

-- Users can view their own quiz attempts
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
    FOR SELECT USING (user_id = auth.uid());

-- Users can create their own quiz attempts
CREATE POLICY "Users can create quiz attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own quiz attempts (for completing)
CREATE POLICY "Users can update own quiz attempts" ON quiz_attempts
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- QUESTION RESPONSES POLICIES
-- ============================================================================

-- Users can view their own question responses
CREATE POLICY "Users can view own question responses" ON question_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quiz_attempts qa
            WHERE qa.id = question_responses.attempt_id
            AND qa.user_id = auth.uid()
        )
    );

-- Users can create their own question responses
CREATE POLICY "Users can create question responses" ON question_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM quiz_attempts qa
            WHERE qa.id = question_responses.attempt_id
            AND qa.user_id = auth.uid()
        )
    );

-- ============================================================================
-- USER STATS POLICIES
-- ============================================================================

-- Users can view their own stats
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT USING (user_id = auth.uid());

-- Users can view stats of people in their groups (for leaderboards)
CREATE POLICY "Users can view group member stats" ON user_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm1
            JOIN group_memberships gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = auth.uid()
            AND gm2.user_id = user_stats.user_id
            AND gm1.is_active = true
            AND gm2.is_active = true
        )
    );

-- Users can insert their own stats (on signup)
CREATE POLICY "Users can insert own stats" ON user_stats
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own stats
CREATE POLICY "Users can update own stats" ON user_stats
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================================================
-- GROUP STATS POLICIES (Public Read for leaderboards)
-- ============================================================================

CREATE POLICY "Anyone can view group stats" ON group_stats
    FOR SELECT USING (true);

-- Authenticated users can create group stats (for admin signup)
CREATE POLICY "Authenticated users can create group stats" ON group_stats
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Group admins can update their group stats
CREATE POLICY "Group admins can update group stats" ON group_stats
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_stats.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'teacher')
            AND gm.is_active = true
        )
    );
