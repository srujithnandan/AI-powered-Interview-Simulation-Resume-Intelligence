export default function EvaluationCard({
  score,
  technicalAccuracy,
  communicationClarity,
  depthOfKnowledge,
  suggestions,
  exampleImprovement,
  onNext,
  isLastQuestion,
}) {
  const scoreColor =
    score >= 7
      ? 'from-green-500 to-emerald-600'
      : score >= 4
        ? 'from-amber-500 to-orange-500'
        : 'from-rose-500 to-red-600';

  const scoreBg =
    score >= 7
      ? 'bg-green-50 border-green-200'
      : score >= 4
        ? 'bg-amber-50 border-amber-200'
        : 'bg-rose-50 border-rose-200';

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Score */}
      <div className={`rounded-2xl border p-6 text-center shadow-sm ${scoreBg}`}>
        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">
          Your Score
        </p>
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={`bg-gradient-to-r bg-clip-text text-6xl font-extrabold text-transparent ${scoreColor}`}
          >
            {score}
          </span>
          <span className="text-2xl font-semibold text-slate-400">/10</span>
        </div>
      </div>

      {/* Evaluation details */}
      <div className="grid gap-4 sm:grid-cols-1">
        {/* Technical Accuracy */}
        {technicalAccuracy && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-sm">
                🎯
              </span>
              <h3 className="text-sm font-semibold text-blue-800">
                Technical Accuracy
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-blue-700">
              {technicalAccuracy}
            </p>
          </div>
        )}

        {/* Communication Clarity */}
        {communicationClarity && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-sm">
                💬
              </span>
              <h3 className="text-sm font-semibold text-purple-800">
                Communication Clarity
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-purple-700">
              {communicationClarity}
            </p>
          </div>
        )}

        {/* Depth of Knowledge */}
        {depthOfKnowledge && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-sm">
                🧠
              </span>
              <h3 className="text-sm font-semibold text-teal-800">
                Depth of Knowledge
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-teal-700">
              {depthOfKnowledge}
            </p>
          </div>
        )}

        {/* Improvement Tips */}
        {suggestions && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-sm">
                💡
              </span>
              <h3 className="text-sm font-semibold text-amber-800">
                Improvement Tips
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-amber-700">
              {suggestions}
            </p>
          </div>
        )}

        {/* Example Improvement */}
        {exampleImprovement && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-100 text-sm">
                ✨
              </span>
              <h3 className="text-sm font-semibold text-cyan-800">
                Example Improvement
              </h3>
            </div>
            <p className="text-sm leading-relaxed text-cyan-700">
              {exampleImprovement}
            </p>
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md"
        >
          {isLastQuestion ? 'View Results' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}
