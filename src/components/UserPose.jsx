// src/components/UserPose.jsx
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

// ==========================================================
// 1. 기하학/수학 헬퍼 함수들 (각도 계산)
// ==========================================================
// 세 점(p1, p2, p3) 사이의 각도(0~180도)를 구하는 함수
function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);

  if (angle > 180.0) {
    angle = 360.0 - angle;
  }
  return angle;
}
// 점수 계산 함수 (비선형 페널티 적용)
// diff: 각도 차이 (도)
function getScoreFromDiff(diff) {
  // 허용 오차(threshold): 10도 까지는 거의 만점
  // 10도를 넘어가면 점수가 급격히 하락하도록 설계
  // 30도 차이나면 거의 0점에 수렴
  const sensitivity = 200; // 민감도 조절 (낮을수록 엄격)
  // 지수 함수 사용: 100 * e^(-(diff^2) / sensitivity)
  const score = 100 * Math.exp(-(diff * diff) / sensitivity);
  
  // 너무 낮은 점수는 0으로 절삭
  return score < 10 ? 0 : score;
}

// 파일명을 기반으로 채점할 주요 관절(각도) 세트를 반환
function getRelevantJoints(filename) {
  const name = filename ? filename.toLowerCase() : "";

  // 미디어파이프 인덱스 단축어
  const { 
    LEFT_SHOULDER: LS, RIGHT_SHOULDER: RS,
    LEFT_ELBOW: LE, RIGHT_ELBOW: RE,
    LEFT_WRIST: LW, RIGHT_WRIST: RW,
    LEFT_HIP: LH, RIGHT_HIP: RH,
    LEFT_KNEE: LK, RIGHT_KNEE: RK,
    LEFT_ANKLE: LA, RIGHT_ANKLE: RA 
  } = POSE_LANDMARKS;

  // 1. 스쿼트/런지 등 하체 운동
  if (name.includes("squat") || name.includes("lunge") || name.includes("lower")) {
    return [
      { name: "왼쪽 무릎", points: [LH, LK, LA] },
      { name: "오른쪽 무릎", points: [RH, RK, RA] },
      { name: "왼쪽 엉덩이", points: [LS, LH, LK] },
      { name: "오른쪽 엉덩이", points: [RS, RH, RK] }
    ];
  }
  
  // 2. 푸시업/프레스 등 상체 운동
  if (name.includes("pushup") || name.includes("press") || name.includes("upper") || name.includes("curl")) {
    return [
      { name: "왼쪽 팔꿈치", points: [LS, LE, LW] },
      { name: "오른쪽 팔꿈치", points: [RS, RE, RW] },
      { name: "왼쪽 어깨", points: [LH, LS, LE] },
      { name: "오른쪽 어깨", points: [RH, RS, RE] }
    ];
  }

  // 3. 기본값 (전신 - 팔다리 모두 체크)
  return [
    { name: "왼쪽 무릎", points: [LH, LK, LA] },
    { name: "오른쪽 무릎", points: [RH, RK, RA] },
    { name: "왼쪽 팔꿈치", points: [LS, LE, LW] },
    { name: "오른쪽 팔꿈치", points: [RS, RE, RW] }
  ];
}

// object-fit: contain 처럼 그리기(레터박스 허용, 크롭 없음)
function drawImageContain(ctx, img, dw, dh) {
  const sw = img.width;
  const sh = img.height;
  const sAspect = sw / sh;
  const dAspect = dw / dh;

  let rw, rh, dx, dy;
  if (sAspect > dAspect) {
    // 소스가 더 가로로 넓음 → 너비 맞추고 상하 여백
    rw = dw;
    rh = Math.floor(dw / sAspect);
    dx = 0;
    dy = Math.floor((dh - rh) / 2);
  } else {
    // 소스가 더 세로로 김 → 높이 맞추고 좌우 여백
    rh = dh;
    rw = Math.floor(dh * sAspect);
    dy = 0;
    dx = Math.floor((dw - rw) / 2);
  }
  ctx.drawImage(img, 0, 0, sw, sh, dx, dy, rw, rh);
}

export default function UserPose({
  selectedVideo,
  overlapVideoRef=null,
  webcamRef = null,
  isPause,
  onVideoEnd = () => {}, // 비디오 종료 콜백
}) {
  const [poseText, setPoseText] = useState("");
  const [poseDurations, setPoseDurations] = useState({
    정자세: 0,
    기울어짐: 0,
    엎드림: 0,
    자리비움: 0,
  });
  const [shoulderSlope, setShoulderSlope] = useState(null);
  const [headOffset, setHeadOffset] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // const webcamRef = useRef(null);       // 입력용
  const canvasRef = useRef(null);       // 보이는 합성(웹캠 + 스켈레톤)

  const poseRef = useRef(null);
  const rafIdRef = useRef(null);
  const activeRef = useRef(false);
  const streamRef = useRef(null);

  const poseStartTimeRef = useRef(Date.now());
  const poseDurationRef = useRef({ 정자세: 0, 기울어짐: 0, 엎드림: 0, 자리비움: 0 });
  const lastPostureRef = useRef("");
  const lastUpdateTimeRef = useRef(Date.now());
  const continuousBadPostureTimeRef = useRef(0);

  const checkLeaveRef = useRef(false);
  const leaveTimeoutRef = useRef(null);

  // const [landmarks, setLandmakrs] = useState([]);
  const recordedLandmarksRef = useRef([]); // 관절 좌표와 타임스탬프를 저장할 배열

  // (onResults는 클로저로 인해 초기 state만 기억할 수 있으므로 ref 사용)
  const isPauseRef = useRef(isPause);

  useEffect(() => {
    isPauseRef.current = isPause;
  }, [isPause]);

  // ==========================================================
  // 2. 정확도 계산 로직 (비동기 함수)
  // ==========================================================
  const calculateAccuracy = async () => {
    if (recordedLandmarksRef.current.length === 0) {
      console.warn("녹화된 데이터가 없습니다.");
      return 0;
    }

    try {
      const fileNameOnly = selectedVideo.split('.')[0]; 
      const jsonPath = `/landmarks/${fileNameOnly}_landmarks.json`;
      
      const response = await fetch(jsonPath);
      if (!response.ok) return 0;
      const guideData = await response.json();

      const targetJoints = getRelevantJoints(selectedVideo);
      
      let totalScore = 0;
      let validFrameCount = 0;

      // 사용자의 전체 움직임 범위(ROM) 확인용 (가만히 있었는지 체크)
      let minAngles = new Array(targetJoints.length).fill(360);
      let maxAngles = new Array(targetJoints.length).fill(0);

      recordedLandmarksRef.current.forEach((userFrame) => {
        const userTime = userFrame.timestamp;
        
        // 타임스탬프 싱크 (단순 근사값)
        const guideFrame = guideData.find(g => Math.abs(g.timestamp - userTime) < 0.1);

        if (guideFrame) {
          let frameScoreSum = 0;
          let jointsInFrame = 0;
          
          targetJoints.forEach((joint, jIdx) => {
            const [idx1, idx2, idx3] = joint.points;
            const uPoints = userFrame.landmarks;
            const gPoints = guideFrame.landmarks;

            // 1. Visibility 체크
            // 관절 신뢰도가 0.5 미만이면 화면에 안보이는 것으로 간주 -> 0점 처리
            const isVisible = 
              uPoints[idx1].visibility > 0.5 && 
              uPoints[idx2].visibility > 0.5 && 
              uPoints[idx3].visibility > 0.5;

            if (!isVisible) {
              // 안 보이면 점수 0점 (혹은 평균에서 제외할 수도 있으나, 
              // 운동 코치라면 보여야 할 부분이 안 보인 것은 감점 요인임)
              frameScoreSum += 0; 
              jointsInFrame++;
              return; 
            }

            const uAngle = calculateAngle(uPoints[idx1], uPoints[idx2], uPoints[idx3]);
            const gAngle = calculateAngle(gPoints[idx1], gPoints[idx2], gPoints[idx3]);

            // ROM 계산을 위해 최소/최대 각도 기록
            minAngles[jIdx] = Math.min(minAngles[jIdx], uAngle);
            maxAngles[jIdx] = Math.max(maxAngles[jIdx], uAngle);

            const diff = Math.abs(uAngle - gAngle);

            // 2. 비선형 채점 함수 사용
            const score = getScoreFromDiff(diff);
            frameScoreSum += score;
            jointsInFrame++;
          });

          if (jointsInFrame > 0) {
            totalScore += (frameScoreSum / jointsInFrame);
            validFrameCount++;
          }
        }
      });

      if (validFrameCount === 0) return 0;

      let finalScore = Math.round(totalScore / validFrameCount);

      // 3. 꼼수 방지 (움직임이 거의 없었으면 점수 대폭 삭감)
      // 모든 타겟 관절의 움직임 범위가 20도 미만이면 "가만히 있었다"고 판단
      const isStatic = targetJoints.every((_, i) => (maxAngles[i] - minAngles[i]) < 20);
      
      if (isStatic) {
        console.log("움직임 감지 안됨: 점수 페널티 적용");
        finalScore = Math.min(finalScore, 20); // 최대 20점으로 제한
      }

      console.log(`최종 점수: ${finalScore} (Static Penalty: ${isStatic})`);
      return finalScore;

    } catch (error) {
      console.error("Error:", error);
      return 0;
    }
  };

  // 외부(부모 컴포넌트)에서 호출할 수 있도록 window에 할당
  useEffect(() => {
    window.getUserPoseData = () => recordedLandmarksRef.current;
    
    // [추가됨] 점수 계산 함수 노출
    window.getExerciseScore = calculateAccuracy;
    
    return () => { 
      delete window.getUserPoseData;
      delete window.getExerciseScore;
    };
  }, [selectedVideo]); // 비디오가 바뀌면 타겟 조인트도 바뀌므로 의존성 추가

// 웹캠 설정 로직
  useEffect(() => {
    let cancelled = false;

    // 웹캠 설정 함수
    const setup = async () => {
      // 자세 인식 참조 없으면 무시
      if (poseRef.current) return;

      // Mediapipe 초기화
      const pose = new Pose({
        // CDN 사용(백틱 필수). 문제 없던 @0.5 계열을 사용
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
      });

      // Mediapipe 설정
      pose.setOptions({
        modelComplexity: 1,
        selfieMode: true,         // 시각은 미러
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      // 관절 좌표 결과 전달
      pose.onResults(onResults);
      // 자세 인식 참조 연결
      poseRef.current = pose;

      try {
        // 카메라 및 마이크 접근을 위한 웹API(navigator.mediaDevices.getUserMedia)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },  // 카메라에는 접근함
          audio: false,                         // 마이크에는 접근하지 않음
        });
        if (cancelled) return;

        // 카메라 종료를 위한 스트림 참조 연결
        streamRef.current = stream;
        // 웹캠에서 비디오 객체를 가져옴
        const videoEl = webcamRef.current?.video;
        if (videoEl) {
          // 연결된 카메라를 가져온 뒤 카메라 재생
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => { });
        }
      } catch (e) {
        console.error("웹캠 접근 실패:", e);
      }

      activeRef.current = true;

      // 관절 좌표를 가져오기 위한 반복
      const loop = async () => {
        if (!activeRef.current) return;
        // 웹캠 비디오(이미지) 가져오기
        const video = webcamRef.current?.video;
        if (video && video.readyState >= 3) {
          try {
            // 웹캠 이미지 기반 관절 좌표 가져오기
            // Mediapipe로 웹캠 이미지 전달
            await poseRef.current?.send({ image: video });
          } catch { }
        }
        // 지속적인 반복을 위한 루프 설정
        // requestAnimationFrame: 관절 좌표를 받아오는 것과 같이 동일한 간격으로
        // 반복되어야 할 경우(ex: 애니메이션) 사용하기 좋은 웹API
        rafIdRef.current = requestAnimationFrame(loop);
      };
      rafIdRef.current = requestAnimationFrame(loop);
    };

    // 웹캠 설정
    setup();

    // 페이지 아웃 시 해제 로직
    return () => {
      cancelled = true;
      activeRef.current = false;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      try {
        poseRef.current?.close();
      } catch { }
      poseRef.current = null;

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
    };
  }, [isPause]);

  // pose.onResults(onResults) 에서 넘어옴
  const onResults = (results) => {
    console.log(isPause)
    // canvasRef: 웹캠 카메라를 그리기 위한 canvas
    const canvas = canvasRef.current;
    if (!canvas || !results) return;

    const poseSection = document.getElementById("pose-section");

    // 컨테이너를 640×360으로 고정했으니 버퍼도 동일 픽셀로 맞춤
    const cw = 640;
    const ch = 360;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    // 웹캠 이미지를 2d 화면으로 그리기 위한 준비
    const ctx = canvas.getContext("2d");
    ctx.save();
    // 웹캠 화면 전체를 전부 지움
    ctx.clearRect(0, 0, cw, ch);

    // selfieMode:true → 결과 프레임은 이미 좌우 반전됨
    if (results.image) {
      // 왼쪽 VideoPanel(object-contain)과 동일한 스케일 정책
      // 웹캠 이미지를 그림
      drawImageContain(ctx, results.image, cw, ch);
    }

    // 일시정지(또는 카운트다운) 중이라면 여기서 그림만 그리고 로직 종료
    // 이렇게 하면 화면에 내 얼굴은 보이지만(거울 효과), 점수 계산이나 녹화는 안 됨
    if (isPauseRef.current) {
      ctx.restore();
      return;
    }

    const poseLandmarks = results.poseLandmarks;

    if (!poseLandmarks || poseLandmarks.length < 33) {
      ctx.restore();
      return;
    }

    // isPause가 아닐 때, 그리고 비교할 영상(overlapVideoRef)이 존재할 때 저장
    if (!isPause && overlapVideoRef?.current) {
        const currentTime = overlapVideoRef.current.currentTime;
        
        // 영상이 실제로 재생 중일 때만 기록 (0초에 멈춰있거나, 같은 프레임 중복 방지)
        // 필요에 따라 소수점 처리를 통해 샘플링 레이트를 조절할 수 있음
        recordedLandmarksRef.current.push({
            timestamp: currentTime, // 시범 영상의 현재 시간 (비교의 기준점)
            landmarks: poseLandmarks // 현재 내 포즈 좌표
        });
        
        // 디버깅용 로그 (필요 시 주석 해제)
        // console.log(`Recorded Frame at: ${currentTime.toFixed(2)}s, Total: ${recordedLandmarksRef.current.length}`);
    }

    // 관절 좌표 시각화
    // drawConnectors(ctx, poseLandmarks, [[11, 12], [12, 24], [11, 23]], {
    //   color: "#22A45D",
    //   lineWidth: 3,
    // });
    // drawLandmarks(ctx, poseLandmarks, { color: "#ef4444", lineWidth: 2, radius: 3 });

    // 관절 좌표 기반 자세 판단
    const { status } = poseDetect(poseLandmarks);

    if (checkLeaveRef.current) {
      checkLeaveRef.current = false;
      setPoseText(status);
      if (leaveTimeoutRef.current) {
        clearTimeout(leaveTimeoutRef.current);
        leaveTimeoutRef.current = null;
      }
    }

    ctx.restore();
  };

  // const { status } = poseDetect(results.poseLandmarks); 에서 넘어옴
  const poseDetect = (landmarks) => {
    // landmakrs가 배열이 아니거나 관절 개수가 부족할경우 미감지로 판단
    // 관절 개수가 부족한 경우 => 웹캠에 문제가 생긴 경우 or 예외
    if (!Array.isArray(landmarks) || landmarks.length < 33) return { status: "미감지" };

    // 특정 관절의 좌표를 불러옴
    const L = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];  // 왼쪽 어꺠
    const R = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]; // 오른쪽 어깨
    const N = landmarks[POSE_LANDMARKS.NOSE];           // 코 중앙

    // =====자세 판단 로직=====
    const slope = Math.abs(L.y - R.y);
    const headOff = N.y - (L.y + R.y) / 2;

    setShoulderSlope(slope.toFixed(4));
    setHeadOffset(headOff.toFixed(4));

    let status = "정자세";
    if (slope < 0.05 && headOff > -0.05 && headOff < 0.1) status = "엎드림";
    else if (slope >= 0.05) status = "기울어짐";

    const now = Date.now();
    const elapsed = (now - poseStartTimeRef.current) / 1000;
    poseStartTimeRef.current = now;

    if (lastPostureRef.current !== status) updatePoseTime(status);

    if (status === "기울어짐" || status === "엎드림") {
      continuousBadPostureTimeRef.current += elapsed;
    } else {
      continuousBadPostureTimeRef.current = 0;
      setShowModal(false);
    }

    if (continuousBadPostureTimeRef.current >= 20 && !showModal) {
      setModalMessage(
        status === "엎드림"
          ? "20초 이상 엎드린 자세입니다! 허리를 펴세요!"
          : "20초 이상 기울어진 자세입니다! 바른 자세로 돌아가세요!"
      );
      setShowModal(true);
    }

    setPoseText(status);
    return { status };
  };

  // if (lastPostureRef.current !== status) updatePoseTime(status); 에서 넘어옴
  const updatePoseTime = (newPose) => {
    const now = Date.now();
    const elapsed = (now - lastUpdateTimeRef.current) / 1000;
    if (lastPostureRef.current) poseDurationRef.current[lastPostureRef.current] += elapsed;
    lastPostureRef.current = newPose;
    lastUpdateTimeRef.current = now;
    setPoseDurations({ ...poseDurationRef.current });
  };

  if (import.meta.hot) {
    import.meta.hot.dispose(() => { });
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ width: '100%' }}>
      <div className="mb-3 text-sm font-semibold text-gray-700">사용자 화면</div>

      {/* ▶ 운동영상과 완전 동일한 컨테이너 크기(640×360, 16:9) */}
      <div
        id="pose-section"
        className="relative rounded-xl overflow-hidden"
        style={{
          aspectRatio: "16 / 9",
          position: 'relative'
        }}
      >
        {/* 입력 전용 웹캠(숨김) */}
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 w-full h-full object-contain"
          audio={false}
          style={{ pointerEvents: "none", display: 'contents' }}
        />

        {/* 합성 캔버스(왼쪽과 동일 스케일 정책: contain) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{
            pointerEvents: "none",
            zIndex: 10,
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />

        {/* 반투명 오버레이: contain + 좌우반전( selfiemode:true 일치 ) */}
        <video
          ref={overlapVideoRef}
          src={`/videos/${selectedVideo}`}
          // autoPlay
          muted
          // loop
          playsInline
          onEnded={onVideoEnd}
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: 0.4,
            pointerEvents: "none",
            zIndex: 20,
            transform: "scaleX(1)",
            transformOrigin: "center",
            position: 'absolute',
            width: '100%',
            height: '100%',
            top: 0,
            left: 0,
          }}
        />
      </div>

      {/* 디버그 텍스트 */}
      {/* {typeof window.ReactNativeWebView === "undefined" && (
        <div style={{ color: "red", marginTop: 10, fontSize: 14 }}>
          자세: {poseText}
          {shoulderSlope && headOffset && (
            <> · 어깨: {shoulderSlope} · 머리: {headOffset}</>
          )}
          <div style={{ marginTop: 4 }}>
            정자세: {poseDurations.정자세.toFixed(1)}초 · 기울어짐: {poseDurations.기울어짐.toFixed(1)}초 · 엎드림: {poseDurations.엎드림.toFixed(1)}초 · 자리비움: {poseDurations.자리비움.toFixed(1)}초
          </div>
        </div>
      )} */}

      {/* 20초 경고 모달 */}
      {/* {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: "#fff", padding: 20, borderRadius: 10 }}>
            <p style={{ fontSize: 18, fontWeight: "bold", color: "red" }}>{modalMessage}</p>
            <button onClick={() => setShowModal(false)} style={{ marginTop: 10 }}>
              닫기
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
}
