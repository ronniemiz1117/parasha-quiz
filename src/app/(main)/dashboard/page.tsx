import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile with stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, user_stats(*)')
    .eq('id', user.id)
    .single()

  // Fetch available quizzes
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, parshiyot(*)')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch recent attempts
  const { data: recentAttempts } = await supabase
    .from('quiz_attempts')
    .select('*, quizzes(*, parshiyot(*))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Fetch user's groups
  const { data: memberships } = await supabase
    .from('group_memberships')
    .select('*, groups(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const stats = profile?.user_stats?.[0] || null

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {profile?.display_name || profile?.hebrew_name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Welcome to the Parasha Quiz
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Quizzes Completed</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.total_quizzes_completed || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Average Score</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.average_score_percent ? `${Math.round(stats.average_score_percent)}%` : '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Points</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.total_points || 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Weekly Streak</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.current_streak_weeks || 0}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Available Quizzes */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Available Quizzes</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {quizzes && quizzes.length > 0 ? (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{quiz.title_hebrew}</h3>
                    <p className="text-sm text-gray-500">
                      {quiz.parshiyot?.name_hebrew} - {quiz.parshiyot?.book_hebrew}
                    </p>
                  </div>
                  <Link
                    href={`/quiz/${quiz.id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Start
                  </Link>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-gray-500">
                No quizzes available at the moment
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-200">
            <Link href="/quizzes" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View all quizzes →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentAttempts && recentAttempts.length > 0 ? (
              recentAttempts.map((attempt) => (
                <div key={attempt.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {attempt.quizzes?.title_hebrew}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(attempt.created_at).toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        (attempt.score_percent || 0) >= 70 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {attempt.score_percent ? `${Math.round(attempt.score_percent)}%` : '-'}
                      </div>
                      <div className="text-sm text-gray-500">
                        Attempt {attempt.attempt_number}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-gray-500">
                You haven&apos;t taken any quizzes yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">My Groups</h2>
          <Link
            href="/groups/join"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Join a Group
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {memberships && memberships.length > 0 ? (
            memberships.map((membership) => (
              <div key={membership.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{membership.groups?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {membership.groups?.institution || membership.groups?.group_type}
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  {membership.role === 'admin' ? 'Admin' : membership.role === 'teacher' ? 'Teacher' : 'Member'}
                </span>
              </div>
            ))
          ) : (
            <div className="px-6 py-4 text-gray-500">
              You haven&apos;t joined any groups yet.{' '}
              <Link href="/groups/join" className="text-blue-600 hover:text-blue-700">
                Join now
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
