-- ============================================================================
-- PARASHA QUIZ APP - DATABASE SCHEMA
-- Designed for PostgreSQL (Supabase)
-- ============================================================================

-- ============================================================================
-- CORE TORAH STRUCTURE
-- ============================================================================

-- 54 weekly Torah portions
CREATE TABLE parshiyot (
    id SERIAL PRIMARY KEY,
    name_hebrew VARCHAR(50) NOT NULL,        -- בראשית
    name_english VARCHAR(50) NOT NULL,       -- Beresheet
    book_hebrew VARCHAR(20) NOT NULL,        -- בראשית
    book_english VARCHAR(20) NOT NULL,       -- Genesis
    week_number INTEGER NOT NULL UNIQUE,     -- 1-54
    start_reference VARCHAR(20),             -- Genesis 1:1
    end_reference VARCHAR(20),               -- Genesis 6:8
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7 aliyot per parasha (plus maftir = 8)
CREATE TABLE aliyot (
    id SERIAL PRIMARY KEY,
    parasha_id INTEGER NOT NULL REFERENCES parshiyot(id) ON DELETE CASCADE,
    aliyah_number INTEGER NOT NULL CHECK (aliyah_number BETWEEN 1 AND 8),
    name_hebrew VARCHAR(20) NOT NULL,        -- ראשון
    name_english VARCHAR(20) NOT NULL,       -- Rishon
    start_reference VARCHAR(20),
    end_reference VARCHAR(20),
    summary_hebrew TEXT,
    UNIQUE(parasha_id, aliyah_number)
);

-- ============================================================================
-- USERS & GROUPS (Supabase Auth integration)
-- ============================================================================

-- Groups for organizing users (synagogues, schools, classes)
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    group_type VARCHAR(20) NOT NULL CHECK (group_type IN ('synagogue', 'school', 'class', 'minyan', 'custom')),
    institution VARCHAR(100),                -- parent organization name
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles - extends Supabase auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(50) NOT NULL,
    hebrew_name VARCHAR(50),
    email VARCHAR(100),
    grade INTEGER CHECK (grade BETWEEN 1 AND 12),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Many-to-many: users can belong to multiple groups
CREATE TABLE group_memberships (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'teacher')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, group_id)
);

-- Group invitations - for admins/teachers to invite students
CREATE TABLE group_invitations (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invite_code VARCHAR(20) NOT NULL UNIQUE,  -- short code students can enter
    created_by UUID NOT NULL REFERENCES profiles(id),
    max_uses INTEGER,                          -- NULL = unlimited
    times_used INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,                    -- NULL = never expires
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who used which invitation (for audit/analytics)
CREATE TABLE invitation_uses (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES group_invitations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invitation_id, user_id)
);

-- ============================================================================
-- QUIZ STRUCTURE
-- ============================================================================

-- Multiple quizzes can exist per parasha
CREATE TABLE quizzes (
    id SERIAL PRIMARY KEY,
    parasha_id INTEGER NOT NULL REFERENCES parshiyot(id) ON DELETE CASCADE,
    title_hebrew VARCHAR(100) NOT NULL,
    title_english VARCHAR(100),
    description_hebrew TEXT,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    time_limit_seconds INTEGER,              -- NULL = no limit
    points_per_question INTEGER NOT NULL DEFAULT 10,
    passing_score_percent INTEGER DEFAULT 70,
    is_published BOOLEAN DEFAULT FALSE,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions belong to a quiz and reference a specific aliyah
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    aliyah_id INTEGER NOT NULL REFERENCES aliyot(id),
    question_text_hebrew TEXT NOT NULL,
    question_text_english TEXT,
    question_type VARCHAR(20) NOT NULL DEFAULT 'multiple_choice'
        CHECK (question_type IN ('multiple_choice', 'true_false')),
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    points INTEGER NOT NULL DEFAULT 10,
    explanation_hebrew TEXT,                 -- shown after answering
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer choices for each question
CREATE TABLE answer_choices (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    choice_text_hebrew TEXT NOT NULL,
    choice_text_english TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUIZ ATTEMPTS & RESPONSES
-- ============================================================================

-- Each time a user takes a quiz
CREATE TABLE quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER,
    total_score INTEGER DEFAULT 0,
    max_possible_score INTEGER,
    score_percent NUMERIC(5,2),
    is_best_attempt BOOLEAN DEFAULT FALSE,   -- for fast leaderboard queries
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(quiz_id, user_id, attempt_number)
);

-- Individual question responses
CREATE TABLE question_responses (
    id SERIAL PRIMARY KEY,
    attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id),
    selected_choice_id INTEGER REFERENCES answer_choices(id),
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER,
    answered_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(attempt_id, question_id)
);

-- ============================================================================
-- USER STATS (Denormalized for performance)
-- ============================================================================

CREATE TABLE user_stats (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    total_quizzes_completed INTEGER DEFAULT 0,
    total_questions_answered INTEGER DEFAULT 0,
    total_correct_answers INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    average_score_percent NUMERIC(5,2) DEFAULT 0,
    current_streak_weeks INTEGER DEFAULT 0,
    best_streak_weeks INTEGER DEFAULT 0,
    last_quiz_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group-level stats for leaderboards
CREATE TABLE group_stats (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE UNIQUE,
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,        -- participated in last 30 days
    total_quizzes_taken INTEGER DEFAULT 0,
    average_score_percent NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Torah structure
CREATE INDEX idx_aliyot_parasha ON aliyot(parasha_id);

-- Quiz structure
CREATE INDEX idx_quizzes_parasha ON quizzes(parasha_id);
CREATE INDEX idx_quizzes_published ON quizzes(is_published, available_from, available_until);
CREATE INDEX idx_questions_quiz ON questions(quiz_id, sort_order);
CREATE INDEX idx_questions_aliyah ON questions(aliyah_id);
CREATE INDEX idx_answer_choices_question ON answer_choices(question_id, sort_order);

-- User/Group lookups
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_group_invitations_code ON group_invitations(invite_code) WHERE is_active = TRUE;
CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);

-- Quiz attempts & leaderboards
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id, quiz_id);
CREATE INDEX idx_quiz_attempts_leaderboard ON quiz_attempts(quiz_id, score_percent DESC)
    WHERE completed_at IS NOT NULL;
CREATE INDEX idx_quiz_attempts_best ON quiz_attempts(quiz_id, user_id)
    WHERE is_best_attempt = TRUE;

-- Stats rankings
CREATE INDEX idx_user_stats_ranking ON user_stats(total_points DESC);
CREATE INDEX idx_group_stats_ranking ON group_stats(average_score_percent DESC);

-- ============================================================================
-- TRIGGERS: Ensure data consistency
-- ============================================================================

-- Ensure question's aliyah belongs to the same parasha as the quiz
CREATE OR REPLACE FUNCTION check_question_aliyah_consistency()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM quizzes q
        JOIN aliyot a ON a.parasha_id = q.parasha_id
        WHERE q.id = NEW.quiz_id AND a.id = NEW.aliyah_id
    ) THEN
        RAISE EXCEPTION 'Aliyah must belong to the same parasha as the quiz';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_question_aliyah
    BEFORE INSERT OR UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION check_question_aliyah_consistency();

-- Update is_best_attempt flag when a quiz attempt is completed
CREATE OR REPLACE FUNCTION update_best_attempt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Clear previous best attempt for this user/quiz
        UPDATE quiz_attempts
        SET is_best_attempt = FALSE
        WHERE user_id = NEW.user_id
          AND quiz_id = NEW.quiz_id
          AND is_best_attempt = TRUE;

        -- Set new best attempt (highest score)
        UPDATE quiz_attempts
        SET is_best_attempt = TRUE
        WHERE id = (
            SELECT id FROM quiz_attempts
            WHERE user_id = NEW.user_id
              AND quiz_id = NEW.quiz_id
              AND completed_at IS NOT NULL
            ORDER BY score_percent DESC, completed_at ASC
            LIMIT 1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_best_attempt
    AFTER UPDATE ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_best_attempt();

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert first parasha
INSERT INTO parshiyot (name_hebrew, name_english, book_hebrew, book_english, week_number, start_reference, end_reference)
VALUES ('בראשית', 'Beresheet', 'בראשית', 'Genesis', 1, 'Genesis 1:1', 'Genesis 6:8');

-- Insert aliyot for Beresheet
INSERT INTO aliyot (parasha_id, aliyah_number, name_hebrew, name_english, start_reference, end_reference, summary_hebrew) VALUES
(1, 1, 'ראשון', 'Rishon', '1:1', '2:3', 'בריאת העולם בששת ימים ושבת'),
(1, 2, 'שני', 'Sheni', '2:4', '2:19', 'גן עדן ויצירת האדם'),
(1, 3, 'שלישי', 'Shelishi', '2:20', '3:21', 'חטא עץ הדעת'),
(1, 4, 'רביעי', 'Revii', '3:22', '4:18', 'קין והבל'),
(1, 5, 'חמישי', 'Chamishi', '4:19', '4:22', 'צאצאי קין'),
(1, 6, 'שישי', 'Shishi', '4:23', '5:24', 'תולדות אדם עד חנוך'),
(1, 7, 'שביעי', 'Shevii', '5:25', '6:8', 'נח והשחתת הדור');

-- Insert sample groups
INSERT INTO groups (name, group_type, institution, description) VALUES
('מניין שחרית', 'minyan', 'בית הכנסת המרכזי', 'מניין הנוער בשחרית'),
('כיתה ח׳1', 'class', 'בית ספר רמב״ם', 'כיתה ח׳ מספר 1'),
('בית ספר רמב״ם', 'school', NULL, 'כל תלמידי בית הספר');

-- Insert sample quiz
INSERT INTO quizzes (parasha_id, title_hebrew, title_english, description_hebrew, max_attempts, time_limit_seconds, is_published)
VALUES (1, 'חידון פרשת בראשית', 'Beresheet Quiz', 'חידון על פרשת השבוע - בראשית', 3, 600, TRUE);

-- Insert sample questions
INSERT INTO questions (quiz_id, aliyah_id, question_text_hebrew, question_type, difficulty, points, sort_order, explanation_hebrew) VALUES
(1, 1, 'מה נברא ביום השלישי?', 'multiple_choice', 1, 10, 1, 'ביום השלישי נבראו היבשה, הימים והצמחייה'),
(1, 1, 'כמה ימים נמשכה הבריאה?', 'multiple_choice', 1, 10, 2, 'הבריאה נמשכה ששה ימים וביום השביעי שבת'),
(1, 3, 'מה היה העונש של האדם לאחר החטא?', 'multiple_choice', 2, 10, 3, 'האדם נענש בעבודת האדמה בזיעת אפו');

-- Insert answer choices
INSERT INTO answer_choices (question_id, choice_text_hebrew, is_correct, sort_order) VALUES
-- Question 1: מה נברא ביום השלישי?
(1, 'יבשה וצמחייה', TRUE, 1),
(1, 'שמש וירח', FALSE, 2),
(1, 'דגים ועופות', FALSE, 3),
(1, 'בהמות וחיות', FALSE, 4),
-- Question 2: כמה ימים נמשכה הבריאה?
(2, 'שישה ימים', TRUE, 1),
(2, 'שבעה ימים', FALSE, 2),
(2, 'חמישה ימים', FALSE, 3),
(2, 'עשרה ימים', FALSE, 4),
-- Question 3: מה היה העונש של האדם?
(3, 'לעבוד את האדמה בזיעת אפו', TRUE, 1),
(3, 'לחיות לנצח', FALSE, 2),
(3, 'להישאר בגן עדן', FALSE, 3),
(3, 'לאכול רק פירות', FALSE, 4);