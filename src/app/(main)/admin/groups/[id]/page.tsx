'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Group {
  id: number
  name: string
  group_type: string
  institution: string | null
  description: string | null
  is_active: boolean
}

interface Invitation {
  id: number
  invite_code: string
  max_uses: number | null
  times_used: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

interface GroupPageProps {
  params: Promise<{ id: string }>
}

export default function AdminGroupPage({ params }: GroupPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [memberCount, setMemberCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Edit form state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGroupType, setEditGroupType] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadGroup = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

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

      // Get group details
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', parseInt(id))
        .single()

      if (!groupData) {
        router.push('/admin')
        return
      }

      setGroup(groupData)
      setEditName(groupData.name)
      setEditGroupType(groupData.group_type)
      setEditInstitution(groupData.institution || '')
      setEditDescription(groupData.description || '')

      // Get member count
      const { count } = await supabase
        .from('group_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', parseInt(id))
        .eq('is_active', true)

      setMemberCount(count || 0)

      // Get invitations
      const { data: inviteData } = await supabase
        .from('group_invitations')
        .select('*')
        .eq('group_id', parseInt(id))
        .order('created_at', { ascending: false })

      setInvitations(inviteData || [])
      setLoading(false)
    }

    loadGroup()
  }, [id, router])

  const handleSaveGroup = async () => {
    if (!group) return
    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('groups')
      .update({
        name: editName,
        group_type: editGroupType,
        institution: editInstitution || null,
        description: editDescription || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', group.id)

    if (!error) {
      setGroup({
        ...group,
        name: editName,
        group_type: editGroupType,
        institution: editInstitution || null,
        description: editDescription || null,
      })
      setEditing(false)
    }

    setSaving(false)
  }

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const getShareLink = (code: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/groups/join?code=${code}`
  }

  const copyShareLink = async (code: string) => {
    const link = getShareLink(code)
    await navigator.clipboard.writeText(link)
    setCopiedCode(`link-${code}`)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!group) {
    return null
  }

  const activeInvites = invitations.filter(inv => inv.is_active)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          ← Back to Admin
        </Link>
      </div>

      {/* Group Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {isAdmin && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit Group
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Group Type</label>
              <select
                value={editGroupType}
                onChange={(e) => setEditGroupType(e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700">Institution</label>
              <input
                type="text"
                value={editInstitution}
                onChange={(e) => setEditInstitution(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveGroup}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditName(group.name)
                  setEditGroupType(group.group_type)
                  setEditInstitution(group.institution || '')
                  setEditDescription(group.description || '')
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-gray-600">
            <p><span className="font-medium">Type:</span> {getGroupTypeLabel(group.group_type)}</p>
            {group.institution && <p><span className="font-medium">Institution:</span> {group.institution}</p>}
            {group.description && <p><span className="font-medium">Description:</span> {group.description}</p>}
            <p><span className="font-medium">Members:</span> {memberCount}</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/admin/groups/${id}/members`}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Members</h3>
          <p className="text-sm text-gray-500 mt-1">View and manage {memberCount} members</p>
        </Link>
        <Link
          href={`/admin/groups/${id}/invites`}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Invite Codes</h3>
          <p className="text-sm text-gray-500 mt-1">{activeInvites.length} active invite codes</p>
        </Link>
        <Link
          href={`/leaderboard?group=${id}`}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-gray-900">Leaderboard</h3>
          <p className="text-sm text-gray-500 mt-1">View group rankings</p>
        </Link>
      </div>

      {/* Active Invite Codes - Quick View */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Invite Codes</h2>
          <Link
            href={`/admin/groups/${id}/invites`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Manage Invites
          </Link>
        </div>

        {activeInvites.length === 0 ? (
          <p className="text-gray-500 text-sm">No active invite codes. Create one to let students join.</p>
        ) : (
          <div className="space-y-3">
            {activeInvites.slice(0, 3).map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <code className="text-lg font-mono font-bold text-blue-600">{invite.invite_code}</code>
                  <p className="text-xs text-gray-500 mt-1">
                    Used {invite.times_used}{invite.max_uses ? ` / ${invite.max_uses}` : ''} times
                    {invite.expires_at && ` • Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(invite.invite_code)}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    {copiedCode === invite.invite_code ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button
                    onClick={() => copyShareLink(invite.invite_code)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {copiedCode === `link-${invite.invite_code}` ? 'Copied!' : 'Share Link'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
