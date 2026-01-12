import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface QuizResultsPageProps {
  params: Promise<{ id: string }>
}

export default async function QuizResultsPage({ params }: QuizResultsPageProps) {
  const { id } = await params
  const quizId = parseInt(id)

  if (isNaN(quizId)) {
    notFound()
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch quiz info
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('*, parshiyot(*)')
    .eq('id', quizId)
    .single()

  if (!quiz) {
    notFound()
  }

  // Fetch all attempts for this quiz
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: true })

  const canRetry = (attempts?.length || 0) < quiz.max_attempts

  // Format time spent
  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">{quiz.title_hebrew}</h1>
        <p className="text-gray-600">Parshat {quiz.parshiyot?.name_hebrew}</p>
      </div>

      {/* Attempts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">My Attempts</h2>
        </div>

        {attempts && attempts.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {attempts.map((attempt) => (
              <Link
                key={attempt.id}
                href={`/quiz/${quizId}/results/${attempt.id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Attempt {attempt.attempt_number}
                      {attempt.is_best_attempt && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                          Best
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(attempt.created_at).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      (attempt.score_percent || 0) >= (quiz.passing_score_percent || 70)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {attempt.score_percent ? `${Math.round(attempt.score_percent)}%` : '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(attempt.time_spent_seconds)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            You haven&apos;t taken this quiz yet
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link
          href="/quizzes"
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Back to Quizzes
        </Link>
        {canRetry && (
          <Link
            href={`/quiz/${quizId}`}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again ({(attempts?.length || 0) + 1}/{quiz.max_attempts})
          </Link>
        )}
      </div>
    </div>
  )
}
