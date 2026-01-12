import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

interface ResultsPageProps {
  params: Promise<{ id: string; attemptId: string }>
}

export default async function AttemptResultsPage({ params }: ResultsPageProps) {
  const { id, attemptId } = await params
  const quizId = parseInt(id)
  const attemptIdNum = parseInt(attemptId)

  if (isNaN(quizId) || isNaN(attemptIdNum)) {
    notFound()
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch attempt with responses
  const { data: attempt, error } = await supabase
    .from('quiz_attempts')
    .select(`
      *,
      quizzes(*, parshiyot(*)),
      question_responses(
        *,
        questions(*, aliyot(*)),
        answer_choices(*)
      )
    `)
    .eq('id', attemptIdNum)
    .eq('user_id', user.id)
    .single()

  if (error || !attempt) {
    notFound()
  }

  // Fetch all answer choices for questions in this quiz
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionIds = attempt.question_responses.map((r: any) => r.question_id)
  const { data: allChoices } = await supabase
    .from('answer_choices')
    .select('*')
    .in('question_id', questionIds)

  // Group choices by question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const choicesByQuestion = allChoices?.reduce((acc: any, choice: any) => {
    if (!acc[choice.question_id]) {
      acc[choice.question_id] = []
    }
    acc[choice.question_id].push(choice)
    return acc
  }, {} as Record<number, typeof allChoices>)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const correctCount = attempt.question_responses.filter((r: any) => r.is_correct).length
  const totalQuestions = attempt.question_responses.length
  const passed = (attempt.score_percent || 0) >= (attempt.quizzes?.passing_score_percent || 70)

  // Format time spent
  const formatTime = (seconds: number | null) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs} seconds`
    return `${mins} min ${secs} sec`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Results Summary */}
      <div className={`rounded-lg shadow p-8 text-center ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className={`text-6xl font-bold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {Math.round(attempt.score_percent || 0)}%
        </div>
        <div className="text-xl font-medium text-gray-900 mb-4">
          {passed ? 'Great Job!' : 'Try Again'}
        </div>
        <div className="text-gray-600">
          {correctCount} out of {totalQuestions} correct answers
        </div>
        <div className="text-gray-500 text-sm mt-2">
          Time: {formatTime(attempt.time_spent_seconds)}
        </div>
      </div>

      {/* Quiz Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold text-gray-900">{attempt.quizzes?.title_hebrew}</h1>
        <p className="text-gray-600">Parshat {attempt.quizzes?.parshiyot?.name_hebrew}</p>
        <div className="mt-4 flex gap-4 text-sm">
          <span>Attempt {attempt.attempt_number}/{attempt.quizzes?.max_attempts}</span>
          <span>•</span>
          <span>{attempt.total_score} points</span>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Answer Review</h2>
        </div>

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {attempt.question_responses.map((response: any, index: number) => {
          const question = response.questions
          const selectedChoice = response.answer_choices
          const questionChoices = choicesByQuestion?.[response.question_id] || []

          return (
            <div key={response.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                  response.is_correct ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {response.is_correct ? '✓' : '✗'}
                </div>

                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-1">
                    Question {index + 1} • {question?.aliyot?.name_hebrew}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-3" dir="rtl">
                    {question?.question_text_hebrew}
                  </h3>

                  <div className="space-y-2" dir="rtl">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {questionChoices.sort((a: any, b: any) => a.sort_order - b.sort_order).map((choice: any) => {
                      const isSelected = choice.id === selectedChoice?.id
                      const isCorrect = choice.is_correct

                      let className = 'p-3 rounded-lg border text-sm '
                      if (isCorrect) {
                        className += 'bg-green-50 border-green-300 text-green-800'
                      } else if (isSelected && !isCorrect) {
                        className += 'bg-red-50 border-red-300 text-red-800'
                      } else {
                        className += 'bg-gray-50 border-gray-200 text-gray-600'
                      }

                      return (
                        <div key={choice.id} className={className}>
                          <span className="flex items-center gap-2">
                            {isSelected && <span className="text-xs">(Your answer)</span>}
                            {isCorrect && <span className="text-xs">(Correct answer)</span>}
                            {choice.choice_text_hebrew}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {question?.explanation_hebrew && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800" dir="rtl">
                      <strong>Explanation:</strong> {question.explanation_hebrew}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <Link
          href={`/quiz/${quizId}/results`}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          All Attempts
        </Link>
        <Link
          href="/quizzes"
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Quizzes
        </Link>
      </div>
    </div>
  )
}
