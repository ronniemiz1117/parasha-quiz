'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Quiz, Question, AnswerChoice, Parasha, Aliyah } from '@/types/database'

interface QuizWithDetails extends Quiz {
  parshiyot: Parasha
  questions: (Question & {
    aliyot: Aliyah
    answer_choices: AnswerChoice[]
  })[]
}

interface QuizPlayerProps {
  quiz: QuizWithDetails
  attemptNumber: number
  userId: string
}

interface Answer {
  questionId: number
  choiceId: number
  timeSpent: number
}

export function QuizPlayer({ quiz, attemptNumber, userId }: QuizPlayerProps) {
  const router = useRouter()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date())
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.time_limit_seconds || null)
  const [submitting, setSubmitting] = useState(false)
  const [quizStarted, setQuizStarted] = useState(false)

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1
  const totalQuestions = quiz.questions.length

  // Create attempt when quiz starts
  const startQuiz = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quiz.id,
        user_id: userId,
        attempt_number: attemptNumber,
        started_at: new Date().toISOString(),
        max_possible_score: quiz.questions.reduce((sum, q) => sum + q.points, 0),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating attempt:', error)
      return
    }

    setAttemptId(data.id)
    setStartTime(new Date())
    setQuestionStartTime(new Date())
    setQuizStarted(true)
  }

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || timeLeft === null) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [quizStarted, timeLeft])

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLeft === 0 && quizStarted) {
      handleSubmitQuiz()
    }
  }, [timeLeft, quizStarted])

  const handleSelectChoice = (choiceId: number) => {
    setSelectedChoiceId(choiceId)
  }

  const handleNextQuestion = () => {
    if (selectedChoiceId === null) return

    const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)

    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        choiceId: selectedChoiceId,
        timeSpent,
      },
    ])

    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setSelectedChoiceId(null)
      setQuestionStartTime(new Date())
    }
  }

  const handleSubmitQuiz = useCallback(async () => {
    if (submitting || !attemptId) return
    setSubmitting(true)

    const supabase = createClient()

    // Include current question's answer if selected
    let finalAnswers = [...answers]
    if (selectedChoiceId !== null) {
      const timeSpent = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000)
      finalAnswers.push({
        questionId: currentQuestion.id,
        choiceId: selectedChoiceId,
        timeSpent,
      })
    }

    // Calculate score
    let totalScore = 0
    const responses = finalAnswers.map((answer) => {
      const question = quiz.questions.find((q) => q.id === answer.questionId)
      const selectedChoice = question?.answer_choices.find((c) => c.id === answer.choiceId)
      const isCorrect = selectedChoice?.is_correct || false
      const pointsEarned = isCorrect ? (question?.points || 0) : 0
      totalScore += pointsEarned

      return {
        attempt_id: attemptId,
        question_id: answer.questionId,
        selected_choice_id: answer.choiceId,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        time_spent_seconds: answer.timeSpent,
      }
    })

    // Insert all responses
    const { error: responsesError } = await supabase
      .from('question_responses')
      .insert(responses)

    if (responsesError) {
      console.error('Error saving responses:', responsesError)
    }

    // Calculate total time spent
    const totalTimeSpent = startTime
      ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
      : 0

    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0)
    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : 0

    // Update attempt with final score
    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .update({
        completed_at: new Date().toISOString(),
        time_spent_seconds: totalTimeSpent,
        total_score: totalScore,
        score_percent: scorePercent,
      })
      .eq('id', attemptId)

    if (attemptError) {
      console.error('Error updating attempt:', attemptError)
    }

    // Update user stats
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (currentStats) {
      const newTotalQuizzes = currentStats.total_quizzes_completed + 1
      const newTotalQuestions = currentStats.total_questions_answered + finalAnswers.length
      const newCorrectAnswers = currentStats.total_correct_answers + responses.filter((r) => r.is_correct).length
      const newTotalPoints = currentStats.total_points + totalScore
      const newAverage = ((currentStats.average_score_percent * currentStats.total_quizzes_completed) + scorePercent) / newTotalQuizzes

      await supabase
        .from('user_stats')
        .update({
          total_quizzes_completed: newTotalQuizzes,
          total_questions_answered: newTotalQuestions,
          total_correct_answers: newCorrectAnswers,
          total_points: newTotalPoints,
          average_score_percent: newAverage,
          last_quiz_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
    }

    router.push(`/quiz/${quiz.id}/results/${attemptId}`)
  }, [submitting, attemptId, answers, selectedChoiceId, questionStartTime, currentQuestion, quiz, startTime, userId, router])

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!quizStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{quiz.title_hebrew}</h1>
          <p className="text-gray-600 mb-2">Parshat {quiz.parshiyot.name_hebrew}</p>

          <div className="my-8 space-y-4">
            <div className="flex justify-center gap-8 text-sm">
              <div>
                <span className="text-gray-500">Questions:</span>{' '}
                <span className="font-medium">{totalQuestions}</span>
              </div>
              {quiz.time_limit_seconds && (
                <div>
                  <span className="text-gray-500">Time:</span>{' '}
                  <span className="font-medium">{Math.floor(quiz.time_limit_seconds / 60)} minutes</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Attempt:</span>{' '}
                <span className="font-medium">{attemptNumber}/{quiz.max_attempts}</span>
              </div>
            </div>

            {quiz.description_hebrew && (
              <p className="text-gray-600">{quiz.description_hebrew}</p>
            )}
          </div>

          <button
            onClick={startQuiz}
            className="bg-blue-600 text-white px-8 py-3 rounded-md text-lg font-medium hover:bg-blue-700"
          >
            Start Quiz
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar and timer */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          {timeLeft !== null && (
            <span className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}`}>
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card - quiz content stays in Hebrew */}
      <div className="bg-white rounded-lg shadow p-6" dir="rtl">
        <div className="mb-2 text-sm text-gray-500">
          {currentQuestion.aliyot.name_hebrew} - {quiz.parshiyot.name_hebrew}
        </div>

        <h2 className="text-xl font-medium text-gray-900 mb-6">
          {currentQuestion.question_text_hebrew}
        </h2>

        <div className="space-y-3">
          {currentQuestion.answer_choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => handleSelectChoice(choice.id)}
              className={`w-full text-right p-4 rounded-lg border-2 transition-colors ${
                selectedChoiceId === choice.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {choice.choice_text_hebrew}
            </button>
          ))}
        </div>

        <div className="mt-8 flex justify-between" dir="ltr">
          <div className="text-sm text-gray-500">
            {currentQuestion.points} points
          </div>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={selectedChoiceId === null || submitting}
              className="bg-green-600 text-white px-6 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Finish Quiz'}
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              disabled={selectedChoiceId === null}
              className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Question →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
