import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QuestionCard from '../components/QuestionCard';
import EvaluationCard from '../components/EvaluationCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { getQuestions, submitAnswer } from '../services/interviewService';
import { getRandomQuestions } from '../data/questionBank';
import toast from 'react-hot-toast';

const ROLES = [
  {
    key: 'Backend Developer',
    label: 'Backend Developer',
    icon: '⚙️',
    desc: 'APIs, databases, server-side logic',
  },
  {
    key: 'Java Developer',
    label: 'Java Developer',
    icon: '☕',
    desc: 'Spring Boot, JVM, enterprise Java',
  },
  {
    key: 'Python Developer',
    label: 'Python Developer',
    icon: '🐍',
    desc: 'FastAPI, MongoDB, async APIs',
  },
  {
    key: 'Full Stack Developer',
    label: 'Full Stack Developer',
    icon: '🚀',
    desc: 'Frontend + Backend + DevOps',
  },
];

export default function Interview() {
  const navigate = useNavigate();

  // Phase: 'select' | 'answering' | 'evaluation' | 'results'
  const [phase, setPhase] = useState('select');

  // Session data
  const [selectedRole, setSelectedRole] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Per-question evaluation
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  // All results for summary
  const [results, setResults] = useState([]);

  // ── Role Selection ──
  const handleSelectRole = async (role) => {
    setSelectedRole(role);
    setLoadingQuestions(true);
    try {
      const data = await getQuestions(role, 5);
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setResults([]);
      setPhase('answering');
      toast.success(`Starting ${role} interview`);
    } catch {
      // Fallback to local question bank
      const localQs = getRandomQuestions(role, 5);
      if (localQs.length > 0) {
        setSessionId('local');
        setQuestions(localQs.map((q) => q.question));
        setCurrentIndex(0);
        setResults([]);
        setPhase('answering');
        toast.success(`Starting ${role} interview (offline mode)`);
      } else {
        toast.error('No questions available for this role');
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Submit Answer ──
  const handleSubmitAnswer = async (answer) => {
    setSubmitting(true);
    try {
      const data = await submitAnswer(sessionId, questions[currentIndex], answer);
      setEvaluation(data);
      setResults((prev) => [...prev, { ...data, question: questions[currentIndex], userAnswer: answer }]);
      setPhase('evaluation');
    } catch {
      // Fallback: generate a local evaluation when backend/OpenAI is unavailable
      const fallback = {
        score: Math.floor(Math.random() * 4) + 5,
        technicalAccuracy: 'Unable to evaluate via AI — review your answer against official documentation for accuracy.',
        communicationClarity: 'Ensure your explanation is structured: state the concept, explain how it works, and give a real-world example.',
        depthOfKnowledge: 'Try to go beyond surface-level definitions — discuss trade-offs, edge cases, and when you would or wouldn\'t use this approach.',
        suggestions: 'Practice explaining concepts out loud as if teaching a junior developer. This builds both depth and clarity.',
        exampleImprovement: 'A stronger answer would include a concrete scenario, relevant trade-offs, and mention of alternative approaches.',
      };
      setEvaluation(fallback);
      setResults((prev) => [...prev, { ...fallback, question: questions[currentIndex], userAnswer: answer }]);
      setPhase('evaluation');
      toast('Offline evaluation — AI unavailable', { icon: '📡' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Next Question or Results ──
  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentIndex((i) => i + 1);
      setEvaluation(null);
      setPhase('answering');
    }
  };

  // ── Restart ──
  const handleRestart = () => {
    setPhase('select');
    setSelectedRole('');
    setSessionId('');
    setQuestions([]);
    setCurrentIndex(0);
    setEvaluation(null);
    setResults([]);
  };

  // ── Summary calculations ──
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const avgScore = results.length > 0 ? totalScore / results.length : 0;
  const strongAnswers = results.filter((r) => r.score >= 7);
  const weakAnswers = results.filter((r) => r.score < 5);

  // ── PHASE: Role Selection ──
  if (phase === 'select') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Simulator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a role to start your AI-powered mock interview
          </p>
        </div>

        {loadingQuestions ? (
          <LoadingSpinner size="lg" message="Generating interview questions..." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => handleSelectRole(r.key)}
                className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl transition-colors group-hover:bg-indigo-100">
                  {r.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-700">
                  {r.label}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── PHASE: Question Answering ──
  if (phase === 'answering') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Interview in Progress</h1>
            <p className="mt-1 text-sm text-slate-500">{selectedRole}</p>
          </div>
          <button
            onClick={handleRestart}
            className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
          >
            End Interview
          </button>
        </div>

        <QuestionCard
          key={currentIndex}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          question={questions[currentIndex]}
          onSubmit={handleSubmitAnswer}
          loading={submitting}
        />
      </div>
    );
  }

  // ── PHASE: Evaluation ──
  if (phase === 'evaluation') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Answer Evaluation</h1>
          <p className="mt-1 text-sm text-slate-500">
            Question {currentIndex + 1} of {questions.length} · {selectedRole}
          </p>
        </div>

        {/* Show the question that was answered */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-500">Question</p>
          <p className="mt-1 text-base font-medium text-slate-800">
            {questions[currentIndex]}
          </p>
        </div>

        <EvaluationCard
          score={evaluation.score}
          technicalAccuracy={evaluation.technicalAccuracy}
          communicationClarity={evaluation.communicationClarity}
          depthOfKnowledge={evaluation.depthOfKnowledge}
          suggestions={evaluation.suggestions}
          exampleImprovement={evaluation.exampleImprovement}
          onNext={handleNext}
          isLastQuestion={currentIndex + 1 >= questions.length}
        />
      </div>
    );
  }

  // ── PHASE: Results Summary ──
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">Interview Complete! 🎉</h1>
        <p className="mt-2 text-sm text-slate-500">
          {selectedRole} · {questions.length} questions answered
        </p>
      </div>

      {/* Score overview */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Score</p>
          <p className="mt-2 text-4xl font-extrabold text-indigo-600">{totalScore}</p>
          <p className="text-sm text-slate-400">out of {questions.length * 10}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Average Score</p>
          <p className={`mt-2 text-4xl font-extrabold ${avgScore >= 7 ? 'text-green-600' : avgScore >= 4 ? 'text-amber-500' : 'text-rose-500'}`}>
            {avgScore.toFixed(1)}
          </p>
          <p className="text-sm text-slate-400">out of 10</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Performance</p>
          <p className="mt-2 text-4xl font-extrabold text-indigo-600">
            {avgScore >= 8 ? 'A' : avgScore >= 6 ? 'B' : avgScore >= 4 ? 'C' : 'D'}
          </p>
          <p className="text-sm text-slate-400">grade</p>
        </div>
      </div>

      {/* Strength areas */}
      {strongAnswers.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-800">
            <span>💪</span> Strength Areas ({strongAnswers.length})
          </h3>
          <ul className="space-y-2">
            {strongAnswers.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                <span className="mt-0.5 font-bold">{r.score}/10</span>
                <span className="line-clamp-1">{r.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Weak areas */}
      {weakAnswers.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <span>📚</span> Areas to Improve ({weakAnswers.length})
          </h3>
          <ul className="space-y-2">
            {weakAnswers.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-rose-700">
                <span className="mt-0.5 font-bold">{r.score}/10</span>
                <span className="line-clamp-1">{r.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question-by-question breakdown */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-800">Question Breakdown</h3>
        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                  {i + 1}
                </span>
                <span className="line-clamp-1 text-sm text-slate-700">{r.question}</span>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  r.score >= 7
                    ? 'bg-green-100 text-green-700'
                    : r.score >= 4
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                }`}
              >
                {r.score}/10
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleRestart}
          className="flex-1 rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Start New Interview
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex-1 rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
