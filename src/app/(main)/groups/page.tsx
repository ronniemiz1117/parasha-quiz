import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GroupsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's groups with stats
  const { data: memberships } = await supabase
    .from('group_memberships')
    .select('*, groups(*, group_stats(*))')
    .eq('user_id', user.id)
    .eq('is_active', true)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        <Link
          href="/groups/join"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Join a Group
        </Link>
      </div>

      {memberships && memberships.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memberships.map((membership) => {
            const group = membership.groups
            const stats = group?.group_stats?.[0]

            return (
              <div key={membership.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{group?.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {group?.institution || getGroupTypeLabel(group?.group_type)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      membership.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : membership.role === 'teacher'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {membership.role === 'admin' ? 'Admin' : membership.role === 'teacher' ? 'Teacher' : 'Member'}
                    </span>
                  </div>

                  {group?.description && (
                    <p className="mt-3 text-sm text-gray-600">{group.description}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Members:</span>{' '}
                        <span className="font-medium">{stats?.total_members || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Average:</span>{' '}
                        <span className="font-medium">
                          {stats?.average_score_percent ? `${Math.round(stats.average_score_percent)}%` : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex gap-4">
                  <Link
                    href={`/leaderboard?group=${group?.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Leaderboard
                  </Link>
                  {(membership.role === 'admin' || membership.role === 'teacher') && (
                    <Link
                      href={`/admin/groups/${group?.id}`}
                      className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                    >
                      Manage Group
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You haven&apos;t joined any groups yet</p>
          <Link
            href="/groups/join"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Join a Group Now
          </Link>
        </div>
      )}
    </div>
  )
}

function getGroupTypeLabel(type?: string) {
  switch (type) {
    case 'synagogue':
      return 'Synagogue'
    case 'school':
      return 'School'
    case 'class':
      return 'Class'
    case 'minyan':
      return 'Minyan'
    default:
      return 'Group'
  }
}
