import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { QuizPlayer } from '@/components/quiz/quiz-player'

interface QuizPageProps {
  params: Promise<{ id: string }>
}

export default async function QuizPage({ params }: QuizPageProps) {
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

  // Fetch quiz with questions and answers
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .select(`
      *,
      parshiyot(*),
      questions(
        *,
        aliyot(*),
        answer_choices(*)
      )
    `)
    .eq('id', quizId)
    .eq('is_published', true)
    .single()

  if (quizError || !quiz) {
    notFound()
  }

  // Sort questions by sort_order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedQuestions = quiz.questions?.sort((a: any, b: any) => a.sort_order - b.sort_order) || []

  // Sort answer choices within each question
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sortedQuestions.forEach((q: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    q.answer_choices?.sort((a: any, b: any) => a.sort_order - b.sort_order)
  })

  // Check how many attempts user has made
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('attempt_number')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .order('attempt_number', { ascending: false })
    .limit(1)

  const lastAttemptNumber = attempts?.[0]?.attempt_number || 0
  const nextAttemptNumber = lastAttemptNumber + 1

  if (nextAttemptNumber > quiz.max_attempts) {
    redirect(`/quiz/${quizId}/results`)
  }

  return (
    <QuizPlayer
      quiz={{
        ...quiz,
        questions: sortedQuestions,
      }}
      attemptNumber={nextAttemptNumber}
      userId={user.id}
    />
  )
}
