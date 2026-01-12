'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function JoinGroupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inviteCode, setInviteCode] = useState('')

  // Pre-fill invite code from URL if present
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase())
    }
  }, [searchParams])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Find the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('group_invitations')
      .select('*, groups(*)')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .eq('is_active', true)
      .single()

    if (inviteError || !invitation) {
      setError('Invite code not found or invalid')
      setLoading(false)
      return
    }

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      setError('This invite code has expired')
      setLoading(false)
      return
    }

    // Check if max uses reached
    if (invitation.max_uses && invitation.times_used >= invitation.max_uses) {
      setError('This invite code has reached its maximum number of uses')
      setLoading(false)
      return
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from('group_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('group_id', invitation.group_id)
      .single()

    if (existingMembership) {
      setError('You are already a member of this group')
      setLoading(false)
      return
    }

    // Create membership
    const { error: membershipError } = await supabase
      .from('group_memberships')
      .insert({
        user_id: user.id,
        group_id: invitation.group_id,
        role: 'member',
      })

    if (membershipError) {
      setError('Error joining group')
      setLoading(false)
      return
    }

    // Log invitation use
    await supabase
      .from('invitation_uses')
      .insert({
        invitation_id: invitation.id,
        user_id: user.id,
      })

    // Increment times_used
    await supabase
      .from('group_invitations')
      .update({ times_used: invitation.times_used + 1 })
      .eq('id', invitation.id)

    // Redirect to groups page
    router.push('/groups')
    router.refresh()
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Join a Group</h1>

        <form onSubmit={handleJoin} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
              Invite Code
            </label>
            <input
              type="text"
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              required
              placeholder="Enter invite code"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
            />
            <p className="mt-2 text-sm text-gray-500">
              Got an invite code from your teacher or group admin? Enter it here
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !inviteCode.trim()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Joining...' : 'Join Group'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <Link href="/groups" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to My Groups
          </Link>
        </div>
      </div>
    </div>
  )
}
