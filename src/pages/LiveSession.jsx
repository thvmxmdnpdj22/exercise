// src/pages/LiveSession.jsx
import React, { useRef, useState, useEffect } from "react";
import VideoPanel from "../components/VideoPanel";
import UserPose from "../components/UserPose";
import PrimaryButton from "../components/PrimaryButton";

export default function LiveSession({
  selected,
  metrics = {},
  onFinish = () => { }
}) {
  // ==========================================================
  // [설정] 카운트다운 안내 문구 (여기서 쉽게 변경하세요)
  // ==========================================================
  const GUIDE_MESSAGE = "모니터에서 다섯 걸음 떨어지세요!";
  // ==========================================================

  // references
  const originalVideoRef = useRef(null);
  const overlapVideoRef = useRef(null);
  const webcamRef = useRef(null);

  // states
  const [isPause, setIsPause] = useState(false);

  // 카운트다운 및 준비 상태 관리
  const [countdown, setCountdown] = useState(5);
  const [isPreparing, setIsPreparing] = useState(true);

  // 결과 분석 중인지 확인하는 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // [핵심 로직] 카운트다운 효과 및 비디오 재생 제어
  useEffect(() => {
    let timer;
    if (isPreparing && countdown > 0) {
      // 준비 중일 때는 1초마다 카운트 다운
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (isPreparing && countdown === 0) {
      // 카운트다운 종료: 운동 시작 (자동 재생)
      setIsPreparing(false);

      // 정확한 싱크를 위해 두 비디오 동시에 재생
      originalVideoRef.current?.play();
      overlapVideoRef.current?.play();
    }
    return () => clearTimeout(timer);
  }, [isPreparing, countdown]);

  // 일시정지/재개 함수
  const runOrPause = () => {
    // 1. 현재 일시정지 상태였다면 -> '재개' 로직 수행
    if (isPause) {
      // 재개 시 5초 카운트다운(준비 상태)을 다시 시작
      setCountdown(5);      
      setIsPreparing(true); 
      setIsPause(false);    
    } 
    // 2. 현재 재생 중이었다면 -> '일시정지' 로직 수행
    else {
      setIsPause(true);     
      setIsPreparing(false); 
      
      originalVideoRef.current?.pause();
      overlapVideoRef.current?.pause();
    }
  }

  // 비디오 종료 시 자동 호출되는 함수
  const handleSessionFinish = async () => {
    setIsAnalyzing(true); // 로딩 애니메이션 시작
    setIsPause(true);     // 웹캠 분석 중지 (리소스 절약)

    if (onFinish) {
      await onFinish();
    }
  };

  return (
    <section className="px-6 pt-12">
      <h2 className="text-center text-2xl font-bold text-red-600"></h2>

      {/* 가로 2칸 고정 */}
      <div className="mt-6 w-full overflow-x-auto">
        <div className="flex flex-nowrap gap-6 items-start justify-start" style={{ minWidth: 1340, position: 'relative' }}>
          <div className="shrink-0" style={{ width: '50%', float: 'left' }}>
            <VideoPanel
              title="가이드 영상"
              src={`/videos/${selected.video}`}
              autoPlay={false}
              muted
              loop={false}
              originalVideoRef={originalVideoRef}
            />
          </div>
          <div className="shrink-0" style={{ width: '50%', float: 'right' }}>
            <UserPose
              selectedVideo={selected.video}
              overlapVideoRef={overlapVideoRef}
              webcamRef={webcamRef}
              isPause={isPause || isPreparing || isAnalyzing}
              onVideoEnd={handleSessionFinish}
            />
          </div>
        </div>
      </div>

      {/* 카운트다운 오버레이 (노인 배려: 크고 선명하게) */}
      {isPreparing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          style={{ pointerEvents: 'none' }}
        >
          <div className="text-center animate-pulse flex flex-col items-center">
            {countdown > 0 ? (
              <>
                <span className="text-[12rem] font-black text-white drop-shadow-lg leading-none mb-4">
                  {countdown}
                </span>
                {/* [추가됨] 안내 문구 출력 */}
                <p className="text-4xl text-yellow-300 font-bold drop-shadow-md bg-black/40 px-6 py-2 rounded-full">
                  {GUIDE_MESSAGE}
                </p>
              </>
            ) : (
              <span className="text-[8rem] font-black text-red-500 drop-shadow-lg leading-none">
                시작!
              </span>
            )}
            
            {/* 카운트다운이 0이 아닐 때만 아래 보조 문구 표시 (선택사항) */}
            {countdown > 0 && (
              <p className="mt-4 text-xl text-gray-200">잠시 후 운동이 시작됩니다</p>
            )}
          </div>
        </div>
      )}

      {/* 결과 분석 중 로딩 애니메이션 오버레이 */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
          <div className="relative flex h-24 w-24">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-24 w-24 bg-emerald-500 justify-center items-center">
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          </div>
          <p className="mt-8 text-3xl font-bold text-white animate-pulse">운동 결과를 분석 중입니다...</p>
          <p className="mt-2 text-gray-300">잠시만 기다려주세요</p>
        </div>
      )}

      {/* Run, Pause 버튼 */}
      <div className="mt-8 flex justify-center" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PrimaryButton onClick={runOrPause}>
          {isPause ? '재개' : (isPreparing ? '준비 중...' : '일시정지')}
        </PrimaryButton>
      </div>

      <div className="mt-8 flex justify-center" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
        <PrimaryButton onClick={onFinish}>결과 보기</PrimaryButton>
      </div>
    </section>
  );
}