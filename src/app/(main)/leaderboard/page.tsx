import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface LeaderboardPageProps {
  searchParams: Promise<{ group?: string }>
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const { group: groupIdParam } = await searchParams

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin/teacher
  const isAdmin = user.user_metadata?.signup_type === 'admin'

  // Fetch user's groups
  const { data: memberships } = await supabase
    .from('group_memberships')
    .select('*, groups(*)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const isTeacherOfAnyGroup = memberships?.some(m => m.role === 'admin' || m.role === 'teacher')
  const userGroupIds = memberships?.map(m => m.group_id) || []

  // Determine which group to show
  let groupId: number | null = null
  if (groupIdParam) {
    const requestedGroupId = parseInt(groupIdParam)
    // Only allow viewing groups user belongs to (unless admin)
    if (isAdmin || isTeacherOfAnyGroup || userGroupIds.includes(requestedGroupId)) {
      groupId = requestedGroupId
    }
  }

  // If user has groups but none selected, default to first group for students
  if (!groupId && memberships && memberships.length > 0 && !isAdmin && !isTeacherOfAnyGroup) {
    groupId = memberships[0].group_id
  }

  // If student has no groups, show message to join one
  if (!isAdmin && !isTeacherOfAnyGroup && userGroupIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You need to join a group to see the leaderboard.</p>
          <Link
            href="/groups/join"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Join a Group
          </Link>
        </div>
      </div>
    )
  }

  // Build leaderboard query
  let leaderboard: Array<{
    id: number
    user_id: string
    total_points: number
    total_quizzes_completed: number
    average_score_percent: number
    current_streak_weeks: number
    profiles: {
      display_name: string | null
      hebrew_name: string | null
      grade: number | null
    } | null
  }> = []

  if (groupId) {
    // Get members of the selected group
    const { data: groupMembers } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('is_active', true)

    const memberUserIds = groupMembers?.map(m => m.user_id) || []

    if (memberUserIds.length > 0) {
      const { data } = await supabase
        .from('user_stats')
        .select('*, profiles(*)')
        .in('user_id', memberUserIds)
        .gt('total_quizzes_completed', 0)
        .order('total_points', { ascending: false })
        .limit(50)

      leaderboard = data || []
    }
  } else if (isAdmin || isTeacherOfAnyGroup) {
    // Admins/teachers can see all users from their groups combined
    if (userGroupIds.length > 0) {
      const { data: allGroupMembers } = await supabase
        .from('group_memberships')
        .select('user_id')
        .in('group_id', userGroupIds)
        .eq('is_active', true)

      const memberUserIds = [...new Set(allGroupMembers?.map(m => m.user_id) || [])]

      if (memberUserIds.length > 0) {
        const { data } = await supabase
          .from('user_stats')
          .select('*, profiles(*)')
          .in('user_id', memberUserIds)
          .gt('total_quizzes_completed', 0)
          .order('total_points', { ascending: false })
          .limit(50)

        leaderboard = data || []
      }
    }
  }

  // Get current user's stats
  const { data: currentUserStats } = await supabase
    .from('user_stats')
    .select('*, profiles(*)')
    .eq('user_id', user.id)
    .single()

  // Find selected group info
  const selectedGroup = groupId
    ? memberships?.find((m) => m.group_id === groupId)?.groups
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>

        {/* Group filter */}
        {memberships && memberships.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="group-filter" className="text-sm text-gray-600">
              {memberships.length > 1 ? 'Select group:' : 'Group:'}
            </label>
            {memberships.length > 1 ? (
              <select
                id="group-filter"
                defaultValue={groupId || ''}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white"
              >
                {(isAdmin || isTeacherOfAnyGroup) && (
                  <option value="">All My Groups</option>
                )}
                {memberships.map((m) => (
                  <option key={m.group_id} value={m.group_id}>
                    {m.groups?.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {memberships[0]?.groups?.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Client-side navigation for select */}
      {memberships && memberships.length > 1 && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.getElementById('group-filter').addEventListener('change', function(e) {
                const value = e.target.value;
                if (value) {
                  window.location.href = '/leaderboard?group=' + value;
                } else {
                  window.location.href = '/leaderboard';
                }
              });
            `
          }}
        />
      )}

      {selectedGroup && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <span className="text-blue-800">
            Showing results for: <strong>{selectedGroup.name}</strong>
          </span>
        </div>
      )}

      {!selectedGroup && (isAdmin || isTeacherOfAnyGroup) && userGroupIds.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <span className="text-purple-800">
            Showing combined results from all your groups
          </span>
        </div>
      )}

      {/* Current user's position */}
      {currentUserStats && currentUserStats.total_quizzes_completed > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Position</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                {currentUserStats.profiles?.display_name?.charAt(0) || '?'}
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {currentUserStats.profiles?.display_name || currentUserStats.profiles?.hebrew_name}
                </div>
                <div className="text-sm text-gray-500">
                  {currentUserStats.total_quizzes_completed} quizzes
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {currentUserStats.total_points}
              </div>
              <div className="text-sm text-gray-500">points</div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quizzes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Average
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Streak
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((entry, index) => {
                const isCurrentUser = entry.user_id === user.id
                const rank = index + 1

                return (
                  <tr
                    key={entry.id}
                    className={isCurrentUser ? 'bg-blue-50' : undefined}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`font-medium ${
                        rank === 1 ? 'text-yellow-500' :
                        rank === 2 ? 'text-gray-400' :
                        rank === 3 ? 'text-amber-600' :
                        'text-gray-900'
                      }`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                          {entry.profiles?.display_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {entry.profiles?.display_name || entry.profiles?.hebrew_name}
                          </div>
                          {entry.profiles?.grade && (
                            <div className="text-xs text-gray-500">
                              Grade {entry.profiles.grade}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {entry.total_quizzes_completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={
                        entry.average_score_percent >= 90 ? 'text-green-600' :
                        entry.average_score_percent >= 70 ? 'text-blue-600' :
                        'text-gray-600'
                      }>
                        {Math.round(entry.average_score_percent)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {entry.current_streak_weeks > 0 ? `${entry.current_streak_weeks} 🔥` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="font-bold text-gray-900">
                        {entry.total_points}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No quiz data yet. Complete some quizzes to appear on the leaderboard!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
