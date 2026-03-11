export default function InterviewQuestion({
  questionNumber,
  totalQuestions,
  question,
  answer,
  onAnswerChange,
  onSubmit,
  loading,
  result,
}) {
  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Question {questionNumber} of {totalQuestions}
        </span>
        <div className="h-2 w-48 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-slate-800">{question}</p>
      </div>

      {/* Answer input */}
      {!result && (
        <div className="space-y-3">
          <textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            rows={6}
            placeholder="Type your answer here..."
            className="w-full rounded-xl border border-slate-300 p-4 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            onClick={onSubmit}
            disabled={loading || !answer.trim()}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4 rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-green-700">{result.score}/10</span>
            <span className="text-sm text-green-600">Score</span>
          </div>
          {result.technicalAccuracy && (
            <div>
              <p className="text-sm font-medium text-slate-700">Technical Accuracy</p>
              <p className="text-sm text-slate-600">{result.technicalAccuracy}</p>
            </div>
          )}
          {result.communicationClarity && (
            <div>
              <p className="text-sm font-medium text-slate-700">Communication</p>
              <p className="text-sm text-slate-600">{result.communicationClarity}</p>
            </div>
          )}
          {result.suggestions && (
            <div>
              <p className="text-sm font-medium text-slate-700">Suggestions</p>
              <p className="text-sm text-slate-600">{result.suggestions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
