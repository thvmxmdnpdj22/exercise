import React, { useEffect, useState } from "react";

// FitTracker 레이아웃 페이지
import Dashboard from "./pages/Dashboard";
import UserSelect from "./pages/UserSelect";

// 기존 운동 코치 플로우 페이지
import ExerciseSelect from "./pages/ExerciseSelect";
import LiveSession from "./pages/LiveSession";
import ResultSummary from "./pages/ResultSummary";
import UserRegister from "./pages/UserRegister";

export default function App() {
  // page 값:
  // "dashboard" | "userSelect" | "select" | "session" | "result"
  // 초기 화면을 ExerciseSelect로 하고 싶으면 "select"로 바꾸면 됨
  const [page, setPage] = useState("dashboard");

  const [selectedExercise, setSelectedExercise] = useState({
    title: "",
    description: "",
    image: "",
    video: "",
  });

  const [metrics, setMetrics] = useState({
    repeat: 0,
    success: 0,
    fail: 0,
    accuracy: 0,
  });

  useEffect(() => {
    if (page !== "session") return;
    // 세션 중 실시간 metric 업데이트 필요하면 여기서 setInterval 사용
    // cleanup 잊지 말고:
    // const id = setInterval(...);
    // return () => clearInterval(id);
  }, [page]);

  const startSession = () => {
    // 필요하면 세션 시작 전에 metric 초기화
    // setMetrics({ repeat: 0, success: 0, fail: 0, accuracy: 0 });
    setPage("session");
  };

  const finishSession = async () => {
    let calculatedScore = 0;

    // UserPose 에서 window.getExerciseScore 를 등록해 둔 경우
    if (typeof window.getExerciseScore === "function") {
      try {
        calculatedScore = await window.getExerciseScore();
      } catch (error) {
        console.error("점수 계산 중 에러 발생:", error);
      }
    }

    setMetrics((prev) => ({
      ...prev,
      accuracy: calculatedScore,
      // 반복/성공/실패 카운트 로직 추가되면 여기서 같이 업데이트
      repeat: prev.repeat,
      success: prev.success,
      fail: prev.fail,
    }));

    setPage("result");
  };

  const resetApp = () => {
    // 결과 화면에서 돌아갈 때 어디로 갈지
    // Exercise 선택 화면으로
    setPage("select");
  };

  // Sidebar가 부르는 페이지 변경 핸들러
  const handleChangePage = (nextPage) => {
    // "dashboard", "userSelect", 필요하면 "select" 등 전달 가능
    setPage(nextPage);
  };

  /* -------------------------
   *  FitTracker 대시보드 계열
   * ------------------------- */

  // if (page === "dashboard") {
  //   return (
  //     <Dashboard
  //       currentPage="dashboard"
  //       onChangePage={handleChangePage}
  //     />
  //   );
  // }

  // if (page === "userSelect") {
  //   return (
  //     <UserSelect
  //       currentPage="userSelect"
  //       onChangePage={handleChangePage}
  //     />
  //   );
  // }

  /* -------------------------
   *  AI 운동 코치 플로우
   * ------------------------- */

  return (
    <div className="min-h-screen bg-[#F6F9F7] text-gray-900">
      <header className="sticky top-0 z-10 bg-[#F6F9F7]/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            ☘︎
          </span>
          <span className="text-lg font-semibold">AI 운동 코치</span>
        </div>
      </header>

      {page === "dashboard" && (
        <Dashboard
          currentPage="dashboard"
          onChangePage={handleChangePage}
        />
      )}

      {page === "userSelect" && (
        <UserSelect
          currentPage="userSelect"
          onChangePage={handleChangePage}
          onStartExercise={() => setPage("select")} 
        />
      )}

      {page === "userRegister" && (
        <UserRegister
          currentPage="userRegister"
          onChangePage={handleChangePage}
        />
      )}

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
