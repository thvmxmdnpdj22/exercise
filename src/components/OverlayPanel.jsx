// src/components/OverlayPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Pose } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

export default function OverlayPanel({
  title = "사용자 화면(오버레이)",
  mirror = true,          // 셀카처럼 좌우 반전
  width = 960,
  height = 540,
}) {
  const videoRef = useRef(null);   // 웹캠 원본
  const canvasRef = useRef(null);  // 그릴 캔버스
  const cameraRef = useRef(null);
  const poseRef = useRef(null);

  const [ready, setReady] = useState({ cam: false, pose: false });

  useEffect(() => {
    const videoEl = videoRef.current;
    const canvasEl = canvasRef.current;
    const ctx = canvasEl.getContext("2d");

    // 1) Pose 인스턴스 (WASM 파일 경로 지정 필수)
    const pose = new Pose({
      locateFile: (file) =>
        // 로컬 node_modules 대신 CDN에서 정적 파일을 가져오면 경로 이슈가 적어요.
        `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    pose.onResults((results) => {
      // 2) 그리기
      // 배경 비디오 프레임을 캔버스에 그리기
      ctx.save();
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // 미러링 옵션
      if (mirror) {
        ctx.translate(canvasEl.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

      // 미러링 복구
      if (mirror) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }

      // 포즈 랜드마크가 있으면 그리기
      if (results.poseLandmarks) {
        // 미러링 상태에서 그릴 필요 없음 (위에서 원본 drawImage만 미러링 처리)
        drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
          color: "#22A45D",
          lineWidth: 4,
        });
        drawLandmarks(ctx, results.poseLandmarks, {
          color: "#2563eb",
          lineWidth: 2,
          radius: 3,
        });
      }

      ctx.restore();
    });

    poseRef.current = pose;

    // 3) 카메라 시작
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width, height },
          audio: false,
        });
        videoEl.srcObject = stream;
        await videoEl.play();
        setReady((r) => ({ ...r, cam: true }));

        const camera = new Camera(videoEl, {
          onFrame: async () => {
            // 프레임마다 pose에 이미지 전달
            await pose.send({ image: videoEl });
          },
          width,
          height,
        });
        camera.start();
        cameraRef.current = camera;
        setReady((r) => ({ ...r, pose: true }));
      } catch (e) {
        console.error("웹캠 접근 실패:", e);
      }
    };

    startCamera();

    // 정리
    return () => {
      try {
        if (cameraRef.current) cameraRef.current.stop();
      } catch {}
      const tracks = videoEl?.srcObject?.getTracks?.() || [];
      tracks.forEach((t) => t.stop());
      if (poseRef.current) {
        // mediapipe pose는 특별한 dispose가 없지만 참조 해제
        poseRef.current = null;
      }
    };
  }, [mirror, width, height]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-semibold text-gray-700">{title}</div>

      <div
        className="relative w-full"
        style={{
          width: "100%",
          maxWidth: width,
          aspectRatio: `${width}/${height}`,
        }}
      >
        {/* 원본 비디오는 숨김(성능 때문에 display:none 대신 visibility hidden) */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />

        {/* 그려지는 캔버스 (미러링은 draw 단계에서 처리) */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="w-full rounded-xl shadow"
          style={{ backgroundColor: "#000" }}
        />

        {/* 상태 배지 */}
        <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
          {ready.cam ? "CAM OK" : "CAM…"} · {ready.pose ? "POSE OK" : "POSE…"}
        </div>
      </div>
    </div>
  );
}
