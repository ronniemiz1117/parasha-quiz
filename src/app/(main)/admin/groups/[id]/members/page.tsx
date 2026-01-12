'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: number
  user_id: string
  role: 'member' | 'admin' | 'teacher'
  joined_at: string
  is_active: boolean
  profiles: {
    display_name: string
    hebrew_name: string | null
    email: string | null
    grade: number | null
  }
  user_stats: {
    total_quizzes_completed: number
    total_points: number
    average_score_percent: number
    current_streak_weeks: number
  } | null
}

interface Group {
  id: number
  name: string
}

interface MembersPageProps {
  params: Promise<{ id: string }>
}

export default function MembersPage({ params }: MembersPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'points' | 'joined'>('name')

  useEffect(() => {
    loadData()
  }, [id, router])

  const loadData = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    // Check if user is admin/teacher of this group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('group_id', parseInt(id))
      .in('role', ['admin', 'teacher'])
      .eq('is_active', true)
      .single()

    if (!membership) {
      router.push('/admin')
      return
    }

    setIsAdmin(membership.role === 'admin')

    // Get group info
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', parseInt(id))
      .single()

    setGroup(groupData)

    // Get all members with their profiles and stats
    const { data: membersData } = await supabase
      .from('group_memberships')
      .select(`
        *,
        profiles (
          display_name,
          hebrew_name,
          email,
          grade
        )
      `)
      .eq('group_id', parseInt(id))
      .eq('is_active', true)
      .order('joined_at', { ascending: true })

    if (membersData) {
      // Fetch stats for each member
      const memberIds = membersData.map(m => m.user_id)
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .in('user_id', memberIds)

      const statsMap = new Map(statsData?.map(s => [s.user_id, s]) || [])

      const membersWithStats = membersData.map(m => ({
        ...m,
        user_stats: statsMap.get(m.user_id) || null
      }))

      setMembers(membersWithStats)
    }

    setLoading(false)
  }

  const handleChangeRole = async (memberId: number, userId: string, newRole: 'member' | 'teacher' | 'admin') => {
    // Don't allow changing own role
    if (userId === currentUserId) return

    const supabase = createClient()

    const { error } = await supabase
      .from('group_memberships')
      .update({ role: newRole })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.map(m =>
        m.id === memberId ? { ...m, role: newRole } : m
      ))
    }
  }

  const handleRemoveMember = async (memberId: number, userId: string) => {
    // Don't allow removing self
    if (userId === currentUserId) return

    if (!confirm('Are you sure you want to remove this member from the group?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('group_memberships')
      .update({ is_active: false })
      .eq('id', memberId)

    if (!error) {
      setMembers(members.filter(m => m.id !== memberId))
    }
  }

  const sortedMembers = [...members].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return (b.user_stats?.total_points || 0) - (a.user_stats?.total_points || 0)
      case 'joined':
        return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      case 'name':
      default:
        return a.profiles.display_name.localeCompare(b.profiles.display_name)
    }
  })

  // Group members by role for display
  const admins = sortedMembers.filter(m => m.role === 'admin')
  const teachers = sortedMembers.filter(m => m.role === 'teacher')
  const regularMembers = sortedMembers.filter(m => m.role === 'member')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/groups/${id}`} className="text-gray-500 hover:text-gray-700">
          ← Back to {group?.name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Members ({members.length})</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'points' | 'joined')}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="name">Name</option>
            <option value="points">Points</option>
            <option value="joined">Join Date</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Members</div>
          <div className="text-2xl font-bold">{members.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Admins & Teachers</div>
          <div className="text-2xl font-bold">{admins.length + teachers.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Avg. Score</div>
          <div className="text-2xl font-bold">
            {members.length > 0
              ? Math.round(members.reduce((sum, m) => sum + (m.user_stats?.average_score_percent || 0), 0) / members.length)
              : 0}%
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Points</div>
          <div className="text-2xl font-bold">
            {members.reduce((sum, m) => sum + (m.user_stats?.total_points || 0), 0)}
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quizzes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedMembers.map((member) => {
              const isSelf = member.user_id === currentUserId

              return (
                <tr key={member.id} className={isSelf ? 'bg-blue-50' : undefined}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                        {member.profiles.display_name?.charAt(0) || '?'}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.profiles.display_name}
                          {isSelf && <span className="ml-2 text-xs text-blue-600">(You)</span>}
                        </div>
                        {member.profiles.hebrew_name && (
                          <div className="text-sm text-gray-500">{member.profiles.hebrew_name}</div>
                        )}
                        {member.profiles.grade && (
                          <div className="text-xs text-gray-400">Grade {member.profiles.grade}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isAdmin && !isSelf ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, member.user_id, e.target.value as 'member' | 'teacher' | 'admin')}
                        className={`text-xs rounded-full px-2 py-1 border-0 ${
                          member.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : member.role === 'teacher'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="member">Member</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        member.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : member.role === 'teacher'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.role === 'admin' ? 'Admin' : member.role === 'teacher' ? 'Teacher' : 'Member'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {member.user_stats?.total_quizzes_completed || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={
                      (member.user_stats?.average_score_percent || 0) >= 90 ? 'text-green-600' :
                      (member.user_stats?.average_score_percent || 0) >= 70 ? 'text-blue-600' :
                      'text-gray-600'
                    }>
                      {member.user_stats?.average_score_percent
                        ? `${Math.round(member.user_stats.average_score_percent)}%`
                        : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.user_stats?.total_points || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {!isSelf && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
