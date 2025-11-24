// src/components/VideoPoseRecorder.jsx
import React, { useRef, useState, useEffect } from "react";
import { Pose, POSE_LANDMARKS } from "@mediapipe/pose";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

export default function VideoPoseRecorder() {
    const [videoSrc, setVideoSrc] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [fileName, setFileName] = useState("motion_data");

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const poseRef = useRef(null);
    const requestRef = useRef(null);

    // 데이터를 저장할 Ref (렌더링 방지)
    const recordedDataRef = useRef([]);

    useEffect(() => {
        const pose = new Pose({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`,
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        pose.onResults(onResults);
        poseRef.current = pose;

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            pose.close();
        };
    }, []);

    // 파일 선택 핸들러
    const onFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setFileName(file.name.split('.')[0]); // 확장자 제거한 이름을 파일명으로
            setProgress(0);
            recordedDataRef.current = [];
        }
    };

    // 분석 시작
    const startProcessing = () => {
        if (!videoRef.current || !poseRef.current) return;

        setIsProcessing(true);
        recordedDataRef.current = []; // 초기화
        videoRef.current.currentTime = 0;
        videoRef.current.play();

        processFrame();
    };

    // 프레임 처리 루프
    const processFrame = async () => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended) {
            if (video && video.ended) {
                finishProcessing();
            }
            return;
        }

        // MediaPipe에 현재 비디오 프레임 전송
        await poseRef.current.send({ image: video });

        // 다음 프레임 요청
        requestRef.current = requestAnimationFrame(processFrame);
    };

    // 결과 수신 및 저장
    const onResults = (results) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;

        // 시각적 확인을 위한 그리기
        if (canvas && video) {
            const ctx = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

            if (results.poseLandmarks) {
                drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
                drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

                // === [핵심 데이터 저장 로직] ===
                // 1. 현재 비디오의 시간(timestamp)과 관절 좌표(landmarks)를 매핑하여 저장
                // 2. 나중에 UserPose에서 currentTime과 가장 가까운 timestamp를 찾아 비교함
                recordedDataRef.current.push({
                    timestamp: video.currentTime,
                    landmarks: results.poseLandmarks,
                });
            }
            ctx.restore();

            // 진행률 업데이트
            if (video.duration) {
                setProgress(Math.round((video.currentTime / video.duration) * 100));
            }
        }
    };

    // 처리 완료 및 다운로드
    const finishProcessing = () => {
        setIsProcessing(false);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        // JSON 파일 생성 및 다운로드
        const dataStr = JSON.stringify(recordedDataRef.current, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}_landmarks.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert("분석이 완료되어 관절 데이터가 다운로드되었습니다.");
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-6">관리자용: 동작 데이터 추출기</h1>

            <div className="mb-4 w-full max-w-2xl bg-white p-4 rounded-lg shadow">
                <label className="block mb-2 font-semibold">1. 분석할 비디오 선택</label>
                <input
                    type="file"
                    accept="video/*"
                    onChange={onFileChange}
                    className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-violet-50 file:text-violet-700
            hover:file:bg-violet-100
          "
                />
            </div>

            {videoSrc && (
                <div className="w-full max-w-4xl relative">
                    <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-lg shadow">
                        <span className="font-bold text-lg">진행률: {progress}%</span>
                        <button
                            onClick={startProcessing}
                            disabled={isProcessing}
                            className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${isProcessing
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                }`}
                        >
                            {isProcessing ? "분석 및 녹화 중..." : "2. 분석 시작 및 JSON 저장"}
                        </button>
                    </div>

                    {/* 비디오 및 캔버스 오버레이 */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-xl border-2 border-gray-300">
                        {/* 원본 비디오 (숨김 처리하거나 캔버스 뒤에 배치) */}
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            className="absolute inset-0 w-full h-full object-contain opacity-0"
                            muted
                            playsInline
                            onEnded={finishProcessing}
                        />
                        {/* 결과 확인용 캔버스 */}
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-contain bg-black"
                        />
                    </div>

                    <p className="mt-4 text-sm text-gray-600 text-center">
                        * 비디오가 처음부터 끝까지 재생되며 프레임별 관절 좌표를 추출합니다.<br />
                        * 재생이 끝나면 자동으로 .json 파일이 다운로드됩니다.
                    </p>
                </div>
            )}
        </div>
    );
}