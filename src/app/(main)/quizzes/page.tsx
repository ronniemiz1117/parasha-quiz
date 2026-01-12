import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function QuizzesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all published quizzes with parasha info
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('*, parshiyot(*)')
    .eq('is_published', true)
    .order('parshiyot(week_number)', { ascending: true })

  // Fetch user's attempts for each quiz
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('quiz_id, attempt_number, score_percent, is_best_attempt')
    .eq('user_id', user.id)

  // Group attempts by quiz
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attemptsByQuiz = attempts?.reduce((acc: any, attempt: any) => {
    if (!acc[attempt.quiz_id]) {
      acc[attempt.quiz_id] = []
    }
    acc[attempt.quiz_id].push(attempt)
    return acc
  }, {} as Record<number, typeof attempts>)

  // Group quizzes by book
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quizzesByBook = quizzes?.reduce((acc: any, quiz: any) => {
    const book = quiz.parshiyot?.book_hebrew || 'Other'
    if (!acc[book]) {
      acc[book] = []
    }
    acc[book].push(quiz)
    return acc
  }, {} as Record<string, typeof quizzes>)

  const bookOrder = ['בראשית', 'שמות', 'ויקרא', 'במדבר', 'דברים']

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">All Quizzes</h1>

      {quizzesByBook && Object.keys(quizzesByBook).length > 0 ? (
        bookOrder.map((book) => {
          const bookQuizzes = quizzesByBook[book]
          if (!bookQuizzes || bookQuizzes.length === 0) return null

          return (
            <div key={book} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Book of {book}</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {bookQuizzes.map((quiz: any) => {
                  const quizAttempts = attemptsByQuiz?.[quiz.id] || []
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const bestAttempt = quizAttempts.find((a: any) => a.is_best_attempt)
                  const attemptCount = quizAttempts.length
                  const canRetry = attemptCount < quiz.max_attempts

                  return (
                    <div key={quiz.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{quiz.title_hebrew}</h3>
                            {bestAttempt && (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                (bestAttempt.score_percent || 0) >= 70
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {Math.round(bestAttempt.score_percent || 0)}%
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Parshat {quiz.parshiyot?.name_hebrew}
                            {quiz.time_limit_seconds && (
                              <> • {Math.floor(quiz.time_limit_seconds / 60)} minutes</>
                            )}
                            {attemptCount > 0 && (
                              <> • {attemptCount}/{quiz.max_attempts} attempts</>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {attemptCount > 0 && (
                            <Link
                              href={`/quiz/${quiz.id}/results`}
                              className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm"
                            >
                              Results
                            </Link>
                          )}
                          {canRetry ? (
                            <Link
                              href={`/quiz/${quiz.id}`}
                              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                              {attemptCount === 0 ? 'Start' : 'Try Again'}
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-sm">
                              No attempts remaining
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No quizzes available at the moment</p>
        </div>
      )}
    </div>
  )
}
