import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function QuizzesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is an admin/teacher (they see their own created quizzes)
  const isAdmin = user.user_metadata?.signup_type === 'admin'

  // Get user's group memberships
  const { data: memberships } = await supabase
    .from('group_memberships')
    .select('group_id, role, groups(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const groupIds = memberships?.map(m => m.group_id) || []
  const isTeacherOfAnyGroup = memberships?.some(m => m.role === 'admin' || m.role === 'teacher')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let quizzes: any[] = []

  if (isAdmin || isTeacherOfAnyGroup) {
    // Admins/teachers see quizzes they created
    const { data } = await supabase
      .from('quizzes')
      .select('*, parshiyot(*)')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    quizzes = data || []
  } else if (groupIds.length > 0) {
    // Students see quizzes assigned to their groups
    const { data: assignments } = await supabase
      .from('quiz_group_assignments')
      .select('quiz_id, group_id')
      .in('group_id', groupIds)
      .eq('is_active', true)

    if (assignments && assignments.length > 0) {
      const quizIds = [...new Set(assignments.map(a => a.quiz_id))]

      const { data } = await supabase
        .from('quizzes')
        .select('*, parshiyot(*)')
        .in('id', quizIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      quizzes = data || []
    }
  }

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

  // No groups message for students
  if (!isAdmin && !isTeacherOfAnyGroup && groupIds.length === 0) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">My Quizzes</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">You need to join a group to see available quizzes.</p>
          <Link
            href="/groups/join"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Join a Group
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isAdmin || isTeacherOfAnyGroup ? 'My Created Quizzes' : 'Available Quizzes'}
        </h1>
        {(isAdmin || isTeacherOfAnyGroup) && (
          <Link
            href="/admin/quizzes"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Manage Quizzes
          </Link>
        )}
      </div>

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
                            {!quiz.is_published && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                Draft
                              </span>
                            )}
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
                          {(isAdmin || isTeacherOfAnyGroup) ? (
                            <Link
                              href={`/admin/quizzes/${quiz.id}`}
                              className="text-purple-600 hover:text-purple-900 px-3 py-2 text-sm"
                            >
                              Edit
                            </Link>
                          ) : (
                            <>
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
                            </>
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
          <p className="text-gray-500">
            {isAdmin || isTeacherOfAnyGroup
              ? "You haven't created any quizzes yet."
              : 'No quizzes available for your groups yet.'}
          </p>
          {(isAdmin || isTeacherOfAnyGroup) && (
            <Link
              href="/admin/quizzes"
              className="inline-block mt-4 bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
            >
              Create Your First Quiz
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
