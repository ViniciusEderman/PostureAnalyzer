import * as posedetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs";
import * as mpPose from "@mediapipe/pose";

const video = document.getElementById("video");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const postureStatus = document.getElementById("posture-status");

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise((resolve) => (video.onloadedmetadata = resolve));
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  } catch (error) {
    console.warn("Sem câmera detectada. Modo de demonstração ativado.");
    postureStatus.textContent = "Sem câmera detectada. Exibindo simulação.";
    canvas.width = 640;
    canvas.height = 480;
  }
}

function analyzeSittingPosture(keypoints) {
  if (!keypoints) return "Aguardando detecção de pose...";

  const leftShoulder = keypoints[11];
  const rightShoulder = keypoints[12];
  const leftHip = keypoints[23];
  const rightHip = keypoints[24];
  const leftEar = keypoints[7];

  let isSpineStraight = true;
  if (leftShoulder && leftHip) {
    if (Math.abs(leftShoulder.x - leftHip.x) > 30 || Math.abs(rightShoulder.x - rightHip.x) > 30) {
      isSpineStraight = false;
    }
  }

  if (leftEar && leftShoulder && leftEar.x > leftShoulder.x + 10) {
    return "Cabeça muito projetada (Text Neck)!";
  }

  if (!isSpineStraight) {
    return "Atenção! Seu tronco parece estar inclinado. Tente sentar-se mais reto.";
  }

  return "Postura sentada básica OK!";
}

function drawSkeleton(ctx, keypoints) {
  const pairs = [
    [11, 12], [11, 23], [12, 24], [23, 24],
    [11, 13], [13, 15], [12, 14], [14, 16], 
  ];
  ctx.strokeStyle = "lime";
  ctx.lineWidth = 2;
  for (const [a, b] of pairs) {
    const kp1 = keypoints[a], kp2 = keypoints[b];
    if (kp1?.score > 0.6 && kp2?.score > 0.6) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }
}

async function main() {
  await setupCamera();

  const detector = await posedetection.createDetector(
    posedetection.SupportedModels.BlazePose,
    {
      runtime: "mediapipe",
      modelType: "full",
      solutionPath: `./node_modules/@mediapipe/pose`,
    }
  );

  async function render() {
    const poses = await detector.estimatePoses(video);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    let statusMessage = "Nenhuma pessoa detectada.";

    if (poses.length > 0) {
      const pose = poses[0];
      drawSkeleton(ctx, pose.keypoints);

      for (const kp of pose.keypoints) {
        if (kp.score > 0.6) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "lime";
          ctx.fill();
        }
      }
      statusMessage = analyzeSittingPosture(pose.keypoints);
    }

    postureStatus.textContent = statusMessage;
    requestAnimationFrame(render);
  }

  render();
}

window.onload = main;