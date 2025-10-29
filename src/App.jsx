import React, { useEffect, useState } from "react";
import ExerciseSelect from "./pages/ExerciseSelect";
import LiveSession from "./pages/LiveSession";
import ResultSummary from "./pages/ResultSummary";

export default function App() {
  const [page, setPage] = useState("select");
  const [selectedExercise, setSelectedExercise] = useState("shoulder");
  const [metrics, setMetrics] = useState({ repeat: 0, success: 0, fail: 0, accuracy: 0 });

  useEffect(() => {
    if (page !== "session") return;
    const id = setInterval(() => {
      setMetrics((m) => {
        const repeat = Math.min(m.repeat + 1, 20);
        const success = Math.min(m.success + (Math.random() > 0.2 ? 1 : 0), 20);
        const fail = Math.min(repeat - success, 20);
        const accuracy = repeat ? Math.round((success / repeat) * 100) : 0;
        return { repeat, success, fail, accuracy };
      });
    }, 900);
    return () => clearInterval(id);
  }, [page]);

  const startSession = () => {
    setMetrics({ repeat: 0, success: 0, fail: 0, accuracy: 0 });
    setPage("session");
  };
  const finishSession = () => setPage("result");
  const resetApp = () => setPage("select");

  return (
    <div className="min-h-screen bg-[#F6F9F7] text-gray-900">
      <header className="sticky top-0 z-10 bg-[#F6F9F7]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">☘︎</span>
          <span className="text-lg font-semibold">AI 운동 코치</span>
        </div>
      </header>

      {page === "select" && (
        <ExerciseSelect
          selected={selectedExercise}
          onSelect={setSelectedExercise}
          onStart={startSession}
        />
      )}
      {page === "session" && (
        <LiveSession
          selected={selectedExercise}
          metrics={metrics}
          onFinish={finishSession}
        />
      )}
      {page === "result" && (
        <ResultSummary
          metrics={metrics}
          onBack={resetApp}
        />
      )}
    </div>
  );
}
