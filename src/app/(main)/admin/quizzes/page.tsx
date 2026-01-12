'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Quiz {
  id: number
  parasha_id: number
  title_hebrew: string
  title_english: string | null
  description_hebrew: string | null
  max_attempts: number
  time_limit_seconds: number | null
  points_per_question: number
  is_published: boolean
  created_at: string
  parshiyot: {
    name_hebrew: string
    name_english: string
  }
  question_count: number
}

interface Parasha {
  id: number
  name_hebrew: string
  name_english: string
  book_english: string
  week_number: number
}

export default function AdminQuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [parshiyot, setParshiyot] = useState<Parasha[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // New quiz form
  const [showNewForm, setShowNewForm] = useState(false)
  const [newParashaId, setNewParashaId] = useState<string>('')
  const [newTitleHebrew, setNewTitleHebrew] = useState('')
  const [newTitleEnglish, setNewTitleEnglish] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newMaxAttempts, setNewMaxAttempts] = useState('3')
  const [newTimeLimit, setNewTimeLimit] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [router])

  const loadData = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Check if user is admin/teacher of any group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'teacher'])
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!membership) {
      router.push('/admin')
      return
    }

    setIsAdmin(membership.role === 'admin')

    // Get all quizzes created by this user
    const { data: quizzesData } = await supabase
      .from('quizzes')
      .select(`
        *,
        parshiyot (
          name_hebrew,
          name_english
        )
      `)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (quizzesData) {
      // Get question counts for each quiz
      const quizIds = quizzesData.map(q => q.id)

      const quizzesWithCounts = await Promise.all(quizzesData.map(async (quiz) => {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', quiz.id)

        return {
          ...quiz,
          question_count: count || 0
        }
      }))

      setQuizzes(quizzesWithCounts)
    }

    // Get all parshiyot for the dropdown
    const { data: parshiyotData } = await supabase
      .from('parshiyot')
      .select('*')
      .order('week_number', { ascending: true })

    setParshiyot(parshiyotData || [])
    setLoading(false)
  }

  const handleCreateQuiz = async () => {
    if (!newParashaId || !newTitleHebrew) return
    setCreating(true)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setCreating(false)
      return
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        parasha_id: parseInt(newParashaId),
        title_hebrew: newTitleHebrew,
        title_english: newTitleEnglish || null,
        description_hebrew: newDescription || null,
        max_attempts: parseInt(newMaxAttempts) || 3,
        time_limit_seconds: newTimeLimit ? parseInt(newTimeLimit) * 60 : null,
        created_by: user.id,
        is_published: false,
      })
      .select(`
        *,
        parshiyot (
          name_hebrew,
          name_english
        )
      `)
      .single()

    if (!error && data) {
      setQuizzes([{ ...data, question_count: 0 }, ...quizzes])
      setShowNewForm(false)
      setNewParashaId('')
      setNewTitleHebrew('')
      setNewTitleEnglish('')
      setNewDescription('')
      setNewMaxAttempts('3')
      setNewTimeLimit('')

      // Navigate to edit page to add questions
      router.push(`/admin/quizzes/${data.id}`)
    }

    setCreating(false)
  }

  const handleTogglePublish = async (quizId: number, currentlyPublished: boolean) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('quizzes')
      .update({ is_published: !currentlyPublished, updated_at: new Date().toISOString() })
      .eq('id', quizId)

    if (!error) {
      setQuizzes(quizzes.map(q =>
        q.id === quizId ? { ...q, is_published: !currentlyPublished } : q
      ))
    }
  }

  const handleDeleteQuiz = async (quizId: number) => {
    if (!confirm('Are you sure you want to delete this quiz? This will also delete all questions and student attempts.')) {
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (!error) {
      setQuizzes(quizzes.filter(q => q.id !== quizId))
    }
  }

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
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          ← Back to Admin
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Create New Quiz
        </button>
      </div>

      {/* New Quiz Form */}
      {showNewForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Quiz</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Parasha *</label>
              <select
                value={newParashaId}
                onChange={(e) => setNewParashaId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a parasha</option>
                {parshiyot.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_english} ({p.name_hebrew}) - {p.book_english}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title (Hebrew) *</label>
                <input
                  type="text"
                  value={newTitleHebrew}
                  onChange={(e) => setNewTitleHebrew(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., חידון פרשת בראשית"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title (English)</label>
                <input
                  type="text"
                  value={newTitleEnglish}
                  onChange={(e) => setNewTitleEnglish(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Beresheet Quiz"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                <input
                  type="number"
                  value={newMaxAttempts}
                  onChange={(e) => setNewMaxAttempts(e.target.value)}
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Limit (minutes, leave empty for none)</label>
                <input
                  type="number"
                  value={newTimeLimit}
                  onChange={(e) => setNewTimeLimit(e.target.value)}
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateQuiz}
                disabled={creating || !newParashaId || !newTitleHebrew}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Quiz'}
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false)
                  setNewParashaId('')
                  setNewTitleHebrew('')
                  setNewTitleEnglish('')
                  setNewDescription('')
                  setNewMaxAttempts('3')
                  setNewTimeLimit('')
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quizzes List */}
      {quizzes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't created any quizzes yet.</p>
          <button
            onClick={() => setShowNewForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quiz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parasha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quizzes.map((quiz) => (
                <tr key={quiz.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {quiz.title_english || quiz.title_hebrew}
                    </div>
                    {quiz.title_english && (
                      <div className="text-sm text-gray-500">{quiz.title_hebrew}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{quiz.parshiyot?.name_english}</div>
                    <div className="text-sm text-gray-500">{quiz.parshiyot?.name_hebrew}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {quiz.question_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      quiz.is_published
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quiz.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <Link
                      href={`/admin/quizzes/${quiz.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleTogglePublish(quiz.id, quiz.is_published)}
                      className={quiz.is_published ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
                    >
                      {quiz.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
