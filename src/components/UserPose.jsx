// src/components/UserPose.jsx
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
// import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils"; // 필요시 주석 해제

// ==========================================================
// [MODULE 1] 수학/기하학 헬퍼 (Cosine Similarity Core)
// ==========================================================

/**
 * 두 랜드마크(점) 사이의 2D 벡터를 계산
 * @param {object} p1 - 시작점 {x, y, ...}
 * @param {object} p2 - 끝점 {x, y, ...}
 * @returns {object} {x, y} 벡터
 */
function getVector(p1, p2) {
  return {
    x: p2.x - p1.x,
    y: p2.y - p1.y,
  };
}

/**
 * 두 벡터 간의 코사인 유사도 계산
 * 결과값 범위: -1.0 (완전 반대) ~ 1.0 (완전 일치)
 */
function calculateCosineSimilarity(v1, v2) {
  const dotProduct = v1.x * v2.x + v1.y * v2.y;
  const magnitude1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const magnitude2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * 코사인 유사도를 점수(0~100)로 변환
 * @param {number} similarity - 코사인 유사도 (-1 ~ 1)
 */
function getScoreFromSimilarity(similarity) {
  // similarity가 1에 가까울수록 좋은 점수
  // 1.0 -> 0도 차이 (100점)
  // 0.9 -> 약 25도 차이
  // 0.8 -> 약 36도 차이

  // 음수(반대 방향)는 0점으로 처리
  const clampedSim = Math.max(0, similarity);

  // 지수 함수를 이용해 1에 가까울수록 점수가 높고, 조금만 틀어져도 점수 하락폭을 줌
  // 50제곱을 하면 0.9일 때 약 0.005가 되어버리므로 조절 필요
  // 여기서는 단순히 각도로 변환 후 기존 감점 로직을 재활용하는 것이 가장 직관적임

  // acos를 통해 라디안 차이를 구하고 degree로 변환
  // similarity 1 -> 0도, 0.5 -> 60도, 0 -> 90도
  const angleDiff = Math.acos(Math.min(Math.max(similarity, -1), 1)) * (180 / Math.PI);

  // 기존의 엄격한 점수 산정 방식 재사용 (200 민감도)
  const sensitivity = 200;
  const score = 100 * Math.exp(-(angleDiff * angleDiff) / sensitivity);

  return score < 10 ? 0 : score;
}

// ==========================================================
// [MODULE 2] 운동 분석 설정 (Configuration)
// ==========================================================

// 파일명에 따라 분석할 '신체 부위(Limbs)'를 정의
// 이전에는 각도(3점)였으나, 코사인 유사도는 벡터(2점)를 비교함
function getRelevantLimbs(filename) {
  const name = filename ? filename.toLowerCase() : "";
  const {
    LEFT_SHOULDER: LS, RIGHT_SHOULDER: RS,
    LEFT_ELBOW: LE, RIGHT_ELBOW: RE,
    LEFT_WRIST: LW, RIGHT_WRIST: RW,
    LEFT_HIP: LH, RIGHT_HIP: RH,
    LEFT_KNEE: LK, RIGHT_KNEE: RK,
    LEFT_ANKLE: LA, RIGHT_ANKLE: RA
  } = POSE_LANDMARKS;

  // 1. 하체 운동 (스쿼트, 런지)
  // 허벅지와 종아리의 벡터 방향이 중요한 운동
  if (name.includes("squat") || name.includes("lunge") || name.includes("lower")) {
    return [
      { name: "왼쪽 허벅지", points: [LH, LK] },
      { name: "오른쪽 허벅지", points: [RH, RK] },
      { name: "왼쪽 종아리", points: [LK, LA] },
      { name: "오른쪽 종아리", points: [RK, RA] },
      { name: "상체(척추)", points: [LS, LH] } // 허리가 펴졌는지 확인용
    ];
  }

  // 2. 상체 운동 (푸시업, 프레스)
  if (name.includes("pushup") || name.includes("press") || name.includes("upper") || name.includes("curl")) {
    return [
      { name: "왼쪽 상완", points: [LS, LE] },
      { name: "오른쪽 상완", points: [RS, RE] },
      { name: "왼쪽 전완", points: [LE, LW] },
      { name: "오른쪽 전완", points: [RE, RW] },
      { name: "몸통", points: [LS, LH] }
    ];
  }

  // 3. 기본값 (전신)
  return [
    { name: "왼쪽 허벅지", points: [LH, LK] },
    { name: "오른쪽 허벅지", points: [RH, RK] },
    { name: "왼쪽 상완", points: [LS, LE] },
    { name: "오른쪽 상완", points: [RS, RE] }
  ];
}

// ==========================================================
// [MODULE 3] 이미지/캔버스 유틸
// ==========================================================
function drawImageContain(ctx, img, dw, dh) {
  const sw = img.width;
  const sh = img.height;
  const sAspect = sw / sh;
  const dAspect = dw / dh;
  let rw, rh, dx, dy;
  if (sAspect > dAspect) {
    rw = dw; rh = Math.floor(dw / sAspect);
    dx = 0; dy = Math.floor((dh - rh) / 2);
  } else {
    rh = dh; rw = Math.floor(dh * sAspect);
    dy = 0; dx = Math.floor((dw - rw) / 2);
  }
  ctx.drawImage(img, 0, 0, sw, sh, dx, dy, rw, rh);
}


// ==========================================================
// [MAIN COMPONENT]
// ==========================================================
export default function UserPose({
  selectedVideo,
  overlapVideoRef = null,
  webcamRef = null,
  isPause,
  onVideoEnd = () => { },
}) {
  // State
  const [poseText, setPoseText] = useState("");
  const [poseDurations, setPoseDurations] = useState({ 정자세: 0, 기울어짐: 0, 엎드림: 0, 자리비움: 0 });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");

  // Refs
  const canvasRef = useRef(null);
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
  const recordedLandmarksRef = useRef([]);
  const isPauseRef = useRef(isPause);

  useEffect(() => { isPauseRef.current = isPause; }, [isPause]);

  // ==========================================================
  // 2. 정확도 계산 로직 (Cosine Similarity 적용)
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

      // [변경점] 관절 각도 세트 -> 신체 부위 벡터 세트 가져오기
      const targetLimbs = getRelevantLimbs(selectedVideo);

      let totalScore = 0;
      let validFrameCount = 0;

      // 움직임 감지용 변수 (Accumulated Movement)
      let totalMovement = 0;
      let lastUserCenter = null;

      recordedLandmarksRef.current.forEach((userFrame) => {
        const userTime = userFrame.timestamp;

        // 싱크 매칭
        const guideFrame = guideData.find(g => Math.abs(g.timestamp - userTime) < 0.1);

        if (guideFrame) {
          let frameScoreSum = 0;
          let limbsInFrame = 0;

          const uPoints = userFrame.landmarks;
          const gPoints = guideFrame.landmarks;

          // 1. 움직임 감지 (엉덩이 중심점 변화량 체크)
          const currentCenter = {
            x: (uPoints[POSE_LANDMARKS.LEFT_HIP].x + uPoints[POSE_LANDMARKS.RIGHT_HIP].x) / 2,
            y: (uPoints[POSE_LANDMARKS.LEFT_HIP].y + uPoints[POSE_LANDMARKS.RIGHT_HIP].y) / 2
          };
          if (lastUserCenter) {
            const moveDist = Math.sqrt(
              Math.pow(currentCenter.x - lastUserCenter.x, 2) +
              Math.pow(currentCenter.y - lastUserCenter.y, 2)
            );
            totalMovement += moveDist;
          }
          lastUserCenter = currentCenter;


          // 2. 코사인 유사도 기반 채점
          targetLimbs.forEach((limb) => {
            const [idx1, idx2] = limb.points; // 시작점, 끝점

            // Visibility Check
            if (uPoints[idx1].visibility < 0.5 || uPoints[idx2].visibility < 0.5) {
              return;
            }

            // [핵심] 벡터 생성 및 유사도 계산
            const uVector = getVector(uPoints[idx1], uPoints[idx2]);
            const gVector = getVector(gPoints[idx1], gPoints[idx2]);

            const similarity = calculateCosineSimilarity(uVector, gVector);
            const score = getScoreFromSimilarity(similarity);

            frameScoreSum += score;
            limbsInFrame++;
          });

          if (limbsInFrame > 0) {
            totalScore += (frameScoreSum / limbsInFrame);
            validFrameCount++;
          }
        }
      });

      if (validFrameCount === 0) return 0;

      let finalScore = Math.round(totalScore / validFrameCount);

      // 3. 꼼수 방지 (움직임이 너무 적으면 페널티)
      // 전체 프레임 동안 엉덩이 중심 이동량이 0.5(화면 절반) 미만이면 거의 안 움직인 것 (단순 예시)
      // 운동 종류에 따라 다를 수 있으나, 여기선 간단히 로깅만 함.
      console.log(`총 움직임 거리: ${totalMovement.toFixed(2)}`);

      if (totalMovement < 0.1) { // 임계값은 튜닝 필요
        console.log("움직임 부족: 페널티 적용");
        finalScore = Math.min(finalScore, 20);
      }

      console.log(`최종 점수(Cosine): ${finalScore}`);
      return finalScore;

    } catch (error) {
      console.error("Error:", error);
      return 0;
    }
  };

  useEffect(() => {
    window.getUserPoseData = () => recordedLandmarksRef.current;
    window.getExerciseScore = calculateAccuracy;
    return () => {
      delete window.getUserPoseData;
      delete window.getExerciseScore;
    };
  }, [selectedVideo]);

  // ==========================================================
  // [Webcam & Mediapipe Setup] (기존 로직 유지)
  // ==========================================================
  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      if (poseRef.current) return;

      const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        selfieMode: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      pose.onResults(onResults);
      poseRef.current = pose;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false,
        });
        if (cancelled) return;
        streamRef.current = stream;
        const videoEl = webcamRef.current?.video;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => { });
        }
      } catch (e) { console.error(e); }

      activeRef.current = true;
      const loop = async () => {
        if (!activeRef.current) return;
        const video = webcamRef.current?.video;
        if (video && video.readyState >= 3) {
          await poseRef.current?.send({ image: video }).catch(() => { });
        }
        rafIdRef.current = requestAnimationFrame(loop);
      };
      rafIdRef.current = requestAnimationFrame(loop);
    };

    setup();

    return () => {
      cancelled = true;
      activeRef.current = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      poseRef.current?.close();
      poseRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      clearTimeout(leaveTimeoutRef.current);
    };
  }, [isPause]);

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;

    const cw = 640;
    const ch = 360;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    if (results.image) {
      drawImageContain(ctx, results.image, cw, ch);
    }

    if (isPauseRef.current) {
      ctx.restore();
      return;
    }

    const poseLandmarks = results.poseLandmarks;
    if (!poseLandmarks || poseLandmarks.length < 33) {
      ctx.restore();
      return;
    }

    if (!isPause && overlapVideoRef?.current) {
      const currentTime = overlapVideoRef.current.currentTime;
      recordedLandmarksRef.current.push({
        timestamp: currentTime,
        landmarks: poseLandmarks
      });
    }

    // Pose Detection & Alert Logic
    const { status } = poseDetect(poseLandmarks);
    if (checkLeaveRef.current) {
      checkLeaveRef.current = false;
      setPoseText(status);
    }
    ctx.restore();
  };

  const poseDetect = (landmarks) => {
    if (!Array.isArray(landmarks) || landmarks.length < 33) return { status: "미감지" };

    const L = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const R = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const N = landmarks[POSE_LANDMARKS.NOSE];

    const slope = Math.abs(L.y - R.y);
    const headOff = N.y - (L.y + R.y) / 2;

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

  const updatePoseTime = (newPose) => {
    const now = Date.now();
    const elapsed = (now - lastUpdateTimeRef.current) / 1000;
    if (lastPostureRef.current) poseDurationRef.current[lastPostureRef.current] += elapsed;
    lastPostureRef.current = newPose;
    lastUpdateTimeRef.current = now;
    setPoseDurations({ ...poseDurationRef.current });
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm" style={{ width: '100%' }}>
      <div className="mb-3 text-sm font-semibold text-gray-700">사용자 화면</div>
      <div
        id="pose-section"
        className="relative rounded-xl overflow-hidden"
        style={{ aspectRatio: "16 / 9", position: 'relative' }}
      >
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 w-full h-full object-contain"
          audio={false}
          style={{ pointerEvents: "none", display: 'contents' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none", zIndex: 10, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
        <video
          ref={overlapVideoRef}
          src={`/videos/${selectedVideo}`}
          muted
          playsInline
          onEnded={onVideoEnd}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ opacity: 0.4, pointerEvents: "none", zIndex: 20, transform: "scaleX(1)", transformOrigin: "center", position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
        />
      </div>
    </div>
  );
}