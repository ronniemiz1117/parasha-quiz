'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserStats } from '@/types/database'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [hebrewName, setHebrewName] = useState('')
  const [grade, setGrade] = useState<number | ''>('')

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setDisplayName(profileData.display_name)
        setHebrewName(profileData.hebrew_name || '')
        setGrade(profileData.grade || '')
      }

      setStats(statsData)
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        hebrew_name: hebrewName || null,
        grade: grade || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id)

    if (error) {
      setError('Error saving profile')
      setSaving(false)
      return
    }

    setSuccess(true)
    setSaving(false)
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Stats Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">My Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500">Quizzes</div>
            <div className="text-2xl font-bold">{stats?.total_quizzes_completed || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Average</div>
            <div className="text-2xl font-bold">
              {stats?.average_score_percent ? `${Math.round(stats.average_score_percent)}%` : '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Points</div>
            <div className="text-2xl font-bold">{stats?.total_points || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Weekly Streak</div>
            <div className="text-2xl font-bold">{stats?.current_streak_weeks || 0}</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Questions Answered:</span>{' '}
            <span className="font-medium">{stats?.total_questions_answered || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Correct Answers:</span>{' '}
            <span className="font-medium">{stats?.total_correct_answers || 0}</span>
          </div>
          <div>
            <span className="text-gray-500">Best Streak:</span>{' '}
            <span className="font-medium">{stats?.best_streak_weeks || 0} weeks</span>
          </div>
          <div>
            <span className="text-gray-500">Last Quiz:</span>{' '}
            <span className="font-medium">
              {stats?.last_quiz_at
                ? new Date(stats.last_quiz_at).toLocaleDateString('en-US')
                : 'Not taken yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              Profile saved successfully
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
              Display Name *
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="hebrewName" className="block text-sm font-medium text-gray-700">
              Hebrew Name
            </label>
            <input
              type="text"
              id="hebrewName"
              value={hebrewName}
              onChange={(e) => setHebrewName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
              <option value="">Select grade</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
