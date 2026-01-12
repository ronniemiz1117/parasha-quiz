'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface GroupWithDetails {
  id: number
  name: string
  group_type: string
  institution: string | null
  description: string | null
  is_active: boolean
  created_at: string
  role: string
  member_count: number
  invite_count: number
}

export default function AdminPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<GroupWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAdminGroups = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get groups where user is admin or teacher
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('*, groups(*)')
        .eq('user_id', user.id)
        .in('role', ['admin', 'teacher'])
        .eq('is_active', true)

      if (!memberships || memberships.length === 0) {
        setLoading(false)
        return
      }

      // Get member counts and invite counts for each group
      const groupsWithDetails: GroupWithDetails[] = []

      for (const membership of memberships) {
        const group = membership.groups

        // Get member count
        const { count: memberCount } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('is_active', true)

        // Get active invite count
        const { count: inviteCount } = await supabase
          .from('group_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)
          .eq('is_active', true)

        groupsWithDetails.push({
          ...group,
          role: membership.role,
          member_count: memberCount || 0,
          invite_count: inviteCount || 0,
        })
      }

      setGroups(groupsWithDetails)
      setLoading(false)
    }

    loadAdminGroups()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You are not an admin of any groups.</p>
          <p className="text-sm text-gray-400">
            Sign up as an admin to create a new group, or ask an existing group admin to promote you.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link
          href="/admin/quizzes"
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Manage Quizzes
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {group.institution || getGroupTypeLabel(group.group_type)}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  group.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {group.role === 'admin' ? 'Admin' : 'Teacher'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Members:</span>{' '}
                  <span className="font-medium">{group.member_count}</span>
                </div>
                <div>
                  <span className="text-gray-500">Invite Codes:</span>{' '}
                  <span className="font-medium">{group.invite_count}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex gap-4">
              <Link
                href={`/admin/groups/${group.id}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Manage Group
              </Link>
              <Link
                href={`/admin/groups/${group.id}/members`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Members
              </Link>
              <Link
                href={`/admin/groups/${group.id}/invites`}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Invites
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getGroupTypeLabel(type: string) {
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
