'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Aliyah {
  id: number
  aliyah_number: number
  name_hebrew: string
  name_english: string
}

interface AnswerChoice {
  id?: number
  choice_text_hebrew: string
  choice_text_english: string
  is_correct: boolean
  sort_order: number
}

interface Question {
  id: number
  aliyah_id: number
  question_text_hebrew: string
  question_text_english: string | null
  question_type: 'multiple_choice' | 'true_false'
  difficulty: number
  points: number
  explanation_hebrew: string | null
  sort_order: number
  answer_choices: AnswerChoice[]
  aliyot?: Aliyah
}

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
  parshiyot?: {
    name_hebrew: string
    name_english: string
  }
}

interface EditQuizPageProps {
  params: Promise<{ id: string }>
}

export default function EditQuizPage({ params }: EditQuizPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [aliyot, setAliyot] = useState<Aliyah[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit quiz form
  const [editingQuiz, setEditingQuiz] = useState(false)
  const [editTitleHebrew, setEditTitleHebrew] = useState('')
  const [editTitleEnglish, setEditTitleEnglish] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editMaxAttempts, setEditMaxAttempts] = useState('')
  const [editTimeLimit, setEditTimeLimit] = useState('')

  // New question form
  const [showNewQuestion, setShowNewQuestion] = useState(false)
  const [newAliyahId, setNewAliyahId] = useState('')
  const [newQuestionHebrew, setNewQuestionHebrew] = useState('')
  const [newQuestionEnglish, setNewQuestionEnglish] = useState('')
  const [newQuestionType, setNewQuestionType] = useState<'multiple_choice' | 'true_false'>('multiple_choice')
  const [newDifficulty, setNewDifficulty] = useState('1')
  const [newPoints, setNewPoints] = useState('10')
  const [newExplanation, setNewExplanation] = useState('')
  const [newChoices, setNewChoices] = useState<AnswerChoice[]>([
    { choice_text_hebrew: '', choice_text_english: '', is_correct: true, sort_order: 1 },
    { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 2 },
    { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 3 },
    { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 4 },
  ])

  useEffect(() => {
    loadData()
  }, [id, router])

  const loadData = async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Get quiz details
    const { data: quizData } = await supabase
      .from('quizzes')
      .select(`
        *,
        parshiyot (
          name_hebrew,
          name_english
        )
      `)
      .eq('id', parseInt(id))
      .eq('created_by', user.id)
      .single()

    if (!quizData) {
      router.push('/admin/quizzes')
      return
    }

    setQuiz(quizData)
    setEditTitleHebrew(quizData.title_hebrew)
    setEditTitleEnglish(quizData.title_english || '')
    setEditDescription(quizData.description_hebrew || '')
    setEditMaxAttempts(String(quizData.max_attempts))
    setEditTimeLimit(quizData.time_limit_seconds ? String(quizData.time_limit_seconds / 60) : '')

    // Get aliyot for this parasha
    const { data: aliyotData } = await supabase
      .from('aliyot')
      .select('*')
      .eq('parasha_id', quizData.parasha_id)
      .order('aliyah_number', { ascending: true })

    setAliyot(aliyotData || [])

    // Get questions with answer choices
    const { data: questionsData } = await supabase
      .from('questions')
      .select(`
        *,
        aliyot (
          id,
          aliyah_number,
          name_hebrew,
          name_english
        ),
        answer_choices (*)
      `)
      .eq('quiz_id', parseInt(id))
      .order('sort_order', { ascending: true })

    setQuestions(questionsData || [])
    setLoading(false)
  }

  const handleSaveQuiz = async () => {
    if (!quiz) return
    setSaving(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('quizzes')
      .update({
        title_hebrew: editTitleHebrew,
        title_english: editTitleEnglish || null,
        description_hebrew: editDescription || null,
        max_attempts: parseInt(editMaxAttempts) || 3,
        time_limit_seconds: editTimeLimit ? parseInt(editTimeLimit) * 60 : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quiz.id)

    if (!error) {
      setQuiz({
        ...quiz,
        title_hebrew: editTitleHebrew,
        title_english: editTitleEnglish || null,
        description_hebrew: editDescription || null,
        max_attempts: parseInt(editMaxAttempts) || 3,
        time_limit_seconds: editTimeLimit ? parseInt(editTimeLimit) * 60 : null,
      })
      setEditingQuiz(false)
    }

    setSaving(false)
  }

  const handleAddQuestion = async () => {
    if (!quiz || !newAliyahId || !newQuestionHebrew) return
    setSaving(true)

    const supabase = createClient()

    // Create question
    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        quiz_id: quiz.id,
        aliyah_id: parseInt(newAliyahId),
        question_text_hebrew: newQuestionHebrew,
        question_text_english: newQuestionEnglish || null,
        question_type: newQuestionType,
        difficulty: parseInt(newDifficulty),
        points: parseInt(newPoints),
        explanation_hebrew: newExplanation || null,
        sort_order: questions.length + 1,
      })
      .select(`
        *,
        aliyot (
          id,
          aliyah_number,
          name_hebrew,
          name_english
        )
      `)
      .single()

    if (questionError || !questionData) {
      setSaving(false)
      return
    }

    // Create answer choices
    const choicesToInsert = newChoices
      .filter(c => c.choice_text_hebrew.trim())
      .map((c, idx) => ({
        question_id: questionData.id,
        choice_text_hebrew: c.choice_text_hebrew,
        choice_text_english: c.choice_text_english || null,
        is_correct: c.is_correct,
        sort_order: idx + 1,
      }))

    const { data: choicesData } = await supabase
      .from('answer_choices')
      .insert(choicesToInsert)
      .select()

    // Add to local state
    setQuestions([...questions, { ...questionData, answer_choices: choicesData || [] }])

    // Reset form
    setShowNewQuestion(false)
    setNewAliyahId('')
    setNewQuestionHebrew('')
    setNewQuestionEnglish('')
    setNewQuestionType('multiple_choice')
    setNewDifficulty('1')
    setNewPoints('10')
    setNewExplanation('')
    setNewChoices([
      { choice_text_hebrew: '', choice_text_english: '', is_correct: true, sort_order: 1 },
      { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 2 },
      { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 3 },
      { choice_text_hebrew: '', choice_text_english: '', is_correct: false, sort_order: 4 },
    ])

    setSaving(false)
  }

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId)

    if (!error) {
      setQuestions(questions.filter(q => q.id !== questionId))
    }
  }

  const handleChoiceChange = (index: number, field: keyof AnswerChoice, value: string | boolean) => {
    const updated = [...newChoices]
    if (field === 'is_correct' && value === true) {
      // Only one correct answer
      updated.forEach((c, i) => {
        c.is_correct = i === index
      })
    } else {
      (updated[index] as any)[field] = value
    }
    setNewChoices(updated)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!quiz) return null

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/quizzes" className="text-gray-500 hover:text-gray-700">
          ← Back to Quizzes
        </Link>
      </div>

      {/* Quiz Details Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {quiz.title_english || quiz.title_hebrew}
            </h1>
            {quiz.title_english && (
              <p className="text-gray-500">{quiz.title_hebrew}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {quiz.parshiyot?.name_english} ({quiz.parshiyot?.name_hebrew})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              quiz.is_published
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {quiz.is_published ? 'Published' : 'Draft'}
            </span>
            {!editingQuiz && (
              <button
                onClick={() => setEditingQuiz(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {editingQuiz ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title (Hebrew) *</label>
                <input
                  type="text"
                  value={editTitleHebrew}
                  onChange={(e) => setEditTitleHebrew(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Title (English)</label>
                <input
                  type="text"
                  value={editTitleEnglish}
                  onChange={(e) => setEditTitleEnglish(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                <input
                  type="number"
                  value={editMaxAttempts}
                  onChange={(e) => setEditMaxAttempts(e.target.value)}
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time Limit (minutes)</label>
                <input
                  type="number"
                  value={editTimeLimit}
                  onChange={(e) => setEditTimeLimit(e.target.value)}
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty for no limit"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveQuiz}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditingQuiz(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 space-y-1">
            {quiz.description_hebrew && <p>{quiz.description_hebrew}</p>}
            <p>Max Attempts: {quiz.max_attempts}</p>
            <p>Time Limit: {quiz.time_limit_seconds ? `${quiz.time_limit_seconds / 60} minutes` : 'None'}</p>
          </div>
        )}
      </div>

      {/* Questions Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Questions ({questions.length})</h2>
        <button
          onClick={() => setShowNewQuestion(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
        >
          Add Question
        </button>
      </div>

      {/* New Question Form */}
      {showNewQuestion && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Question</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Aliyah *</label>
                <select
                  value={newAliyahId}
                  onChange={(e) => setNewAliyahId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an aliyah</option>
                  {aliyot.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name_english} ({a.name_hebrew})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Question Type</label>
                <select
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value as 'multiple_choice' | 'true_false')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Question (Hebrew) *</label>
              <textarea
                value={newQuestionHebrew}
                onChange={(e) => setNewQuestionHebrew(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the question in Hebrew"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Question (English)</label>
              <textarea
                value={newQuestionEnglish}
                onChange={(e) => setNewQuestionEnglish(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the question in English (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Difficulty (1-5)</label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Points</label>
                <input
                  type="number"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  min="1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Explanation (shown after answering)</label>
              <textarea
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional explanation in Hebrew"
              />
            </div>

            {/* Answer Choices */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer Choices</label>
              <div className="space-y-3">
                {newChoices.map((choice, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={choice.is_correct}
                      onChange={() => handleChoiceChange(index, 'is_correct', true)}
                      className="mt-3"
                    />
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={choice.choice_text_hebrew}
                        onChange={(e) => handleChoiceChange(index, 'choice_text_hebrew', e.target.value)}
                        placeholder={`Answer ${index + 1} (Hebrew)`}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={choice.choice_text_english}
                        onChange={(e) => handleChoiceChange(index, 'choice_text_english', e.target.value)}
                        placeholder={`Answer ${index + 1} (English)`}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {choice.is_correct && (
                      <span className="text-green-600 text-sm mt-2">Correct</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Select the radio button next to the correct answer</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddQuestion}
                disabled={saving || !newAliyahId || !newQuestionHebrew || !newChoices.some(c => c.choice_text_hebrew && c.is_correct)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Question'}
              </button>
              <button
                onClick={() => setShowNewQuestion(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No questions yet. Add your first question to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {question.aliyot?.name_english}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded">
                      {question.points} pts
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded">
                      Difficulty: {question.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-900 font-medium">
                    {question.question_text_english || question.question_text_hebrew}
                  </p>
                  {question.question_text_english && (
                    <p className="text-gray-500 text-sm mt-1">{question.question_text_hebrew}</p>
                  )}

                  {/* Show answer choices */}
                  <div className="mt-3 space-y-1">
                    {question.answer_choices.map((choice, choiceIdx) => (
                      <div
                        key={choice.id || choiceIdx}
                        className={`text-sm px-3 py-1 rounded ${
                          choice.is_correct
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        {choice.choice_text_english || choice.choice_text_hebrew}
                        {choice.is_correct && ' ✓'}
                      </div>
                    ))}
                  </div>

                  {question.explanation_hebrew && (
                    <p className="text-sm text-gray-500 mt-2 italic">
                      Explanation: {question.explanation_hebrew}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="text-red-600 hover:text-red-800 text-sm ml-4"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
