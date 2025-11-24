import React, { useEffect, useState } from "react";
import ExerciseSelect from "./pages/ExerciseSelect";
import LiveSession from "./pages/LiveSession";
import ResultSummary from "./pages/ResultSummary";

export default function App() {
  const [page, setPage] = useState("select");
  const [selectedExercise, setSelectedExercise] = useState({
    title: '',
    description: '',
    image: '',
    video: '',
  });

  const [metrics, setMetrics] = useState({ repeat: 1, success: 24, fail: 3, accuracy: 80 });

  useEffect(() => {
    if (page !== "session") return;
    // const id = setInterval(() => {
    //   setMetrics((m) => {
    //     const repeat = Math.min(m.repeat + 1, 20);
    //     const success = Math.min(m.success + (Math.random() > 0.2 ? 1 : 0), 20);
    //     const fail = Math.min(repeat - success, 20);
    //     const accuracy = repeat ? Math.round((success / repeat) * 100) : 0;
    //     return { repeat, success, fail, accuracy };
    //   });
    // }, 900);
    // return () => clearInterval(id);
  }, [page]);

  const startSession = () => {
    // setMetrics({ repeat: 0, success: 0, fail: 0, accuracy: 0 });
    setPage("session");
  };
  // const finishSession = () => setPage("result");
  // 운동 종료 시 정확도 계산 로직 연동
  const finishSession = async () => {
    let calculatedScore = 0;

    // UserPose 컴포넌트에서 window 객체에 등록한 점수 계산 함수가 있는지 확인
    if (typeof window.getExerciseScore === 'function') {
      try {
        // 비동기 함수 호출 (JSON 파일 로드 및 관절 각도 비교)
        calculatedScore = await window.getExerciseScore();
      } catch (error) {
        console.error("점수 계산 중 에러 발생:", error);
      }
    }

    // 계산된 정확도를 상태에 반영
    setMetrics((prev) => ({
      ...prev,
      accuracy: calculatedScore, 
      // 참고: 현재 UserPose 로직은 '정확도'만 계산하고 있습니다.
      // 반복 횟수(repeat, success, fail) 카운팅 로직이 추가되면 여기서 같이 업데이트하면 됩니다.
      repeat: prev.repeat, 
      success: prev.success, 
      fail: prev.fail, 
    }));

    // 결과 페이지로 이동
    setPage("result");
  };
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
