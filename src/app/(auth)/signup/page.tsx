'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type SignupType = 'student' | 'admin' | null

export default function SignupPage() {
  const router = useRouter()
  const [signupType, setSignupType] = useState<SignupType>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [hebrewName, setHebrewName] = useState('')
  const [grade, setGrade] = useState<number | ''>('')

  // Student-specific
  const [inviteCode, setInviteCode] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()

    // For students, validate invite code first
    let invitation = null
    if (signupType === 'student') {
      const { data: inviteData, error: inviteError } = await supabase
        .from('group_invitations')
        .select('*, groups(*)')
        .eq('invite_code', inviteCode.toUpperCase().trim())
        .eq('is_active', true)
        .single()

      if (inviteError || !inviteData) {
        setError('Invalid invite code. Please check with your teacher or group admin.')
        setLoading(false)
        return
      }

      // Check if expired
      if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
        setError('This invite code has expired')
        setLoading(false)
        return
      }

      // Check if max uses reached
      if (inviteData.max_uses && inviteData.times_used >= inviteData.max_uses) {
        setError('This invite code has reached its maximum number of uses')
        setLoading(false)
        return
      }

      invitation = inviteData
    }

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          signup_type: signupType,
        }
      }
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Error creating account')
      setLoading(false)
      return
    }

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update profile with additional fields
    await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        hebrew_name: hebrewName || null,
        grade: signupType === 'student' ? (grade || null) : null,
      })
      .eq('id', authData.user.id)

    if (signupType === 'student' && invitation) {
      // Join the group from the invite code
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          user_id: authData.user.id,
          group_id: invitation.group_id,
          role: 'member',
        })

      if (membershipError) {
        console.error('Membership error:', membershipError)
      }

      // Log invitation use
      await supabase
        .from('invitation_uses')
        .insert({
          invitation_id: invitation.id,
          user_id: authData.user.id,
        })

      // Increment times_used
      await supabase
        .from('group_invitations')
        .update({ times_used: invitation.times_used + 1 })
        .eq('id', invitation.id)
    }

    // For admins, just redirect - they'll create groups from the admin panel
    if (signupType === 'admin') {
      router.push('/admin')
    } else {
      router.push('/dashboard')
    }
    router.refresh()
  }

  // Step 1: Choose signup type
  if (signupType === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create an account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              How would you like to sign up?
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setSignupType('student')}
              className="w-full flex items-center justify-between p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">I'm a Student</h3>
                <p className="text-sm text-gray-500">I have an invite code from my teacher</p>
              </div>
              <div className="text-4xl">📚</div>
            </button>

            <button
              onClick={() => setSignupType('admin')}
              className="w-full flex items-center justify-between p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">I'm an Admin/Teacher</h3>
                <p className="text-sm text-gray-500">I want to create and manage groups</p>
              </div>
              <div className="text-4xl">👨‍🏫</div>
            </button>
          </div>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Step 2: Signup form based on type
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <button
            onClick={() => setSignupType(null)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back
          </button>
          <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
            {signupType === 'student' ? 'Student Sign Up' : 'Admin/Teacher Sign Up'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {signupType === 'student'
              ? 'Join your group with an invite code'
              : 'Create your account, then set up groups from the admin panel'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Invite code for students */}
            {signupType === 'student' && (
              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                  Invite Code *
                </label>
                <input
                  id="inviteCode"
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest uppercase"
                  placeholder="Enter code from your teacher"
                />
              </div>
            )}

            {signupType === 'student' && <hr className="my-4" />}

            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Display Name *
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name displayed to others"
              />
            </div>

            <div>
              <label htmlFor="hebrewName" className="block text-sm font-medium text-gray-700">
                Hebrew Name
              </label>
              <input
                id="hebrewName"
                type="text"
                value={hebrewName}
                onChange={(e) => setHebrewName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Hebrew name (optional)"
              />
            </div>

            {signupType === 'student' && (
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700">
                  Grade
                </label>
                <select
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value ? parseInt(e.target.value) : '')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select grade (optional)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Grade {g}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter password again"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
