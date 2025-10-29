// src/components/UserPose.jsx
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

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

export default function UserPose() {
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

  const webcamRef = useRef(null);       // 입력용
  const canvasRef = useRef(null);       // 보이는 합성(웹캠 + 스켈레톤)
  const overlayVideoRef = useRef(null); // 반투명 오버레이

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

  const updatePoseTime = (newPose) => {
    const now = Date.now();
    const elapsed = (now - lastUpdateTimeRef.current) / 1000;
    if (lastPostureRef.current) poseDurationRef.current[lastPostureRef.current] += elapsed;
    lastPostureRef.current = newPose;
    lastUpdateTimeRef.current = now;
    setPoseDurations({ ...poseDurationRef.current });
  };

  const poseDetect = (landmarks) => {
    if (!Array.isArray(landmarks) || landmarks.length < 33) return { status: "미감지" };

    const L = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
    const R = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
    const N = landmarks[POSE_LANDMARKS.NOSE];

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

  const onResults = (results) => {
    const canvas = canvasRef.current;
    if (!canvas || !results) return;

    // 컨테이너를 640×360으로 고정했으니 버퍼도 동일 픽셀로 맞춤
    const cw = 640;
    const ch = 360;
    if (canvas.width !== cw) canvas.width = cw;
    if (canvas.height !== ch) canvas.height = ch;

    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // selfieMode:true → 결과 프레임은 이미 좌우 반전됨
    if (results.image) {
      // 왼쪽 VideoPanel(object-contain)과 동일한 스케일 정책
      drawImageContain(ctx, results.image, cw, ch);
    }

    if (!results.poseLandmarks || results.poseLandmarks.length < 33) {
      ctx.restore();
      return;
    }

    drawConnectors(ctx, results.poseLandmarks, [[11, 12], [12, 24], [11, 23]], {
      color: "#22A45D",
      lineWidth: 3,
    });
    drawLandmarks(ctx, results.poseLandmarks, { color: "#ef4444", lineWidth: 2, radius: 3 });

    const { status } = poseDetect(results.poseLandmarks);

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

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      if (poseRef.current) return;

      const pose = new Pose({
        // CDN 사용(백틱 필수). 문제 없던 @0.5 계열을 사용
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
      });

      pose.setOptions({
        modelComplexity: 1,
        selfieMode: true,         // 시각은 미러
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
          await videoEl.play().catch(() => {});
        }
      } catch (e) {
        console.error("웹캠 접근 실패:", e);
      }

      activeRef.current = true;
      const loop = async () => {
        if (!activeRef.current) return;
        const video = webcamRef.current?.video;
        if (video && video.readyState >= 3) {
          try {
            await poseRef.current?.send({ image: video });
          } catch {}
        }
        rafIdRef.current = requestAnimationFrame(loop);
      };
      rafIdRef.current = requestAnimationFrame(loop);
    };

    setup();

    return () => {
      cancelled = true;
      activeRef.current = false;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      try {
        poseRef.current?.close();
      } catch {}
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
  }, []);

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {});
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-700">사용자 화면</div>

      {/* ▶ 운동영상과 완전 동일한 컨테이너 크기(640×360, 16:9) */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: "640px",
          height: "360px",
          aspectRatio: "16 / 9",
        }}
      >
        {/* 입력 전용 웹캠(숨김) */}
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 w-full h-full object-contain"
          audio={false}
          style={{ opacity: 0, pointerEvents: "none" }}
        />

        {/* 합성 캔버스(왼쪽과 동일 스케일 정책: contain) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "none", zIndex: 10 }}
        />

        {/* 반투명 오버레이: contain + 좌우반전( selfiemode:true 일치 ) */}
        <video
          ref={overlayVideoRef}
          src="/videos/Lunge.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            opacity: 0.25,
            pointerEvents: "none",
            zIndex: 20,
            transform: "scaleX(-1)",
            transformOrigin: "center",
          }}
        />
      </div>

      {/* 디버그 텍스트 */}
      {typeof window.ReactNativeWebView === "undefined" && (
        <div style={{ color: "red", marginTop: 10, fontSize: 14 }}>
          자세: {poseText}
          {shoulderSlope && headOffset && (
            <> · 어깨: {shoulderSlope} · 머리: {headOffset}</>
          )}
          <div style={{ marginTop: 4 }}>
            정자세: {poseDurations.정자세.toFixed(1)}초 · 기울어짐: {poseDurations.기울어짐.toFixed(1)}초 · 엎드림: {poseDurations.엎드림.toFixed(1)}초 · 자리비움: {poseDurations.자리비움.toFixed(1)}초
          </div>
        </div>
      )}

      {/* 20초 경고 모달 */}
      {showModal && (
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
      )}
    </div>
  );
}
