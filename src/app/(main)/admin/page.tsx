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
  const [userId, setUserId] = useState<string | null>(null)

  // Create group form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupType, setGroupType] = useState('synagogue')
  const [institution, setInstitution] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAdminGroups()
  }, [router])

  const loadAdminGroups = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setUserId(user.id)

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

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !groupName.trim()) return

    setCreating(true)
    setError(null)

    const supabase = createClient()

    // Create the group
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupName,
        group_type: groupType,
        institution: institution || null,
      })
      .select('id')
      .single()

    if (groupError) {
      console.error('Group creation error:', groupError)
      setError('Error creating group. Please try again.')
      setCreating(false)
      return
    }

    // Add user as admin
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        user_id: userId,
        group_id: groupData.id,
        role: 'admin',
      })

    if (membershipError) {
      console.error('Membership error:', membershipError)
      setError('Group created but error adding you as admin.')
      setCreating(false)
      return
    }

    // Create group stats
    await supabase
      .from('group_stats')
      .insert({
        group_id: groupData.id,
      })

    // Create initial invite code
    const inviteCode = generateInviteCode()
    await supabase
      .from('group_invitations')
      .insert({
        group_id: groupData.id,
        invite_code: inviteCode,
        created_by: userId,
      })

    // Reset form and reload
    setGroupName('')
    setGroupType('synagogue')
    setInstitution('')
    setShowCreateForm(false)
    setCreating(false)

    // Reload the groups list
    setLoading(true)
    await loadAdminGroups()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
          >
            Create Group
          </button>
          {groups.length > 0 && (
            <Link
              href="/admin/quizzes"
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Manage Quizzes
            </Link>
          )}
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h2>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name *</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Beth Israel Youth Group"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Type *</label>
              <select
                value={groupType}
                onChange={(e) => setGroupType(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="synagogue">Synagogue</option>
                <option value="school">School</option>
                <option value="class">Class</option>
                <option value="minyan">Minyan</option>
                <option value="custom">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Institution Name</label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Congregation Beth Israel (optional)"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !groupName.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Group'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setGroupName('')
                  setGroupType('synagogue')
                  setInstitution('')
                  setError(null)
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h2>
          <p className="text-gray-500 mb-4">
            You don't have any groups yet. Create your first group to get started.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
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
      )}
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
