'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Invitation {
  id: number
  invite_code: string
  max_uses: number | null
  times_used: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

interface Group {
  id: number
  name: string
}

interface InvitesPageProps {
  params: Promise<{ id: string }>
}

export default function InvitesPage({ params }: InvitesPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // New invite form
  const [showNewForm, setShowNewForm] = useState(false)
  const [maxUses, setMaxUses] = useState<string>('')
  const [expiresIn, setExpiresIn] = useState<string>('')

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

    // Get group info
    const { data: groupData } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', parseInt(id))
      .single()

    setGroup(groupData)

    // Get invitations
    const { data: inviteData } = await supabase
      .from('group_invitations')
      .select('*')
      .eq('group_id', parseInt(id))
      .order('created_at', { ascending: false })

    setInvitations(inviteData || [])
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

  const handleCreateInvite = async () => {
    setCreating(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setCreating(false)
      return
    }

    let expiresAt: string | null = null
    if (expiresIn) {
      const days = parseInt(expiresIn)
      if (days > 0) {
        const date = new Date()
        date.setDate(date.getDate() + days)
        expiresAt = date.toISOString()
      }
    }

    const { data, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: parseInt(id),
        invite_code: generateInviteCode(),
        created_by: user.id,
        max_uses: maxUses ? parseInt(maxUses) : null,
        expires_at: expiresAt,
      })
      .select()
      .single()

    if (!error && data) {
      setInvitations([data, ...invitations])
      setShowNewForm(false)
      setMaxUses('')
      setExpiresIn('')
    }

    setCreating(false)
  }

  const handleDeactivate = async (inviteId: number) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('group_invitations')
      .update({ is_active: false })
      .eq('id', inviteId)

    if (!error) {
      setInvitations(invitations.map(inv =>
        inv.id === inviteId ? { ...inv, is_active: false } : inv
      ))
    }
  }

  const handleReactivate = async (inviteId: number) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('group_invitations')
      .update({ is_active: true })
      .eq('id', inviteId)

    if (!error) {
      setInvitations(invitations.map(inv =>
        inv.id === inviteId ? { ...inv, is_active: true } : inv
      ))
    }
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

  const activeInvites = invitations.filter(inv => inv.is_active)
  const inactiveInvites = invitations.filter(inv => !inv.is_active)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/groups/${id}`} className="text-gray-500 hover:text-gray-700">
          ← Back to {group?.name}
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invite Codes</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Create New Code
        </button>
      </div>

      {/* New Invite Form */}
      {showNewForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Invite Code</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Max Uses (leave empty for unlimited)
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expires in Days (leave empty for never)
              </label>
              <input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateInvite}
                disabled={creating}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Code'}
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false)
                  setMaxUses('')
                  setExpiresIn('')
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Invite Codes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Active Codes ({activeInvites.length})</h2>
        </div>

        {activeInvites.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No active invite codes. Create one to let students join.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activeInvites.map((invite) => {
              const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
              const isMaxedOut = invite.max_uses && invite.times_used >= invite.max_uses

              return (
                <div key={invite.id} className="p-4 flex items-center justify-between">
                  <div>
                    <code className="text-xl font-mono font-bold text-blue-600">{invite.invite_code}</code>
                    <div className="text-sm text-gray-500 mt-1 space-x-3">
                      <span>Used {invite.times_used}{invite.max_uses ? ` / ${invite.max_uses}` : ''} times</span>
                      {invite.expires_at && (
                        <span className={isExpired ? 'text-red-500' : ''}>
                          {isExpired ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                        </span>
                      )}
                      {isMaxedOut && <span className="text-red-500">Max uses reached</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Created {new Date(invite.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(invite.invite_code)}
                      className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                    >
                      {copiedCode === invite.invite_code ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={() => copyShareLink(invite.invite_code)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {copiedCode === `link-${invite.invite_code}` ? 'Copied!' : 'Share Link'}
                    </button>
                    <button
                      onClick={() => handleDeactivate(invite.id)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive Invite Codes */}
      {inactiveInvites.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Inactive Codes ({inactiveInvites.length})</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {inactiveInvites.map((invite) => (
              <div key={invite.id} className="p-4 flex items-center justify-between opacity-60">
                <div>
                  <code className="text-xl font-mono font-bold text-gray-400">{invite.invite_code}</code>
                  <div className="text-sm text-gray-400 mt-1">
                    Used {invite.times_used} times • Deactivated
                  </div>
                </div>
                <button
                  onClick={() => handleReactivate(invite.id)}
                  className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                >
                  Reactivate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to invite students</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Create an invite code above (or use an existing one)</li>
          <li>Share the code with your students, or click "Share Link" to copy a direct join link</li>
          <li>Students enter the code during signup, or visit the link to join your group</li>
        </ol>
      </div>
    </div>
  )
}
