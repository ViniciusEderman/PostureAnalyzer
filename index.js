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

    console.log(`Câmera carregada: ${video.videoWidth}x${video.videoHeight}`);
  } catch (error) {
    console.error("Erro ao acessar a câmera:", error);
    alert("Não foi possível acessar a câmera. Verifique as permissões.");
  }
}

function analyzeSittingPosture(keypoints) {
  if (!keypoints) return "Aguardando detecção de pose...";

  const leftShoulder = keypoints[11];
  const rightShoulder = keypoints[12];
  const leftHip = keypoints[23];
  const rightHip = keypoints[24];

  let isSpineStraight = true;
  if (leftShoulder && leftHip) {
    if (
      Math.abs(leftShoulder.x - leftHip.x) > 30 ||
      Math.abs(rightShoulder.x - rightHip.x) > 30
    ) {
      isSpineStraight = false;
    }
  }

  const leftEar = keypoints[7];

  if (leftEar && leftShoulder) {
    if (leftEar.x > leftShoulder.x + 10) {
      return "Cabeça muito projetada (Text Neck)!";
    }
  }

  if (!isSpineStraight) {
    return "Atenção! Seu tronco parece estar inclinado ou desalinhado. Tente sentar-se mais reto.";
  }

  return "Postura sentada básica OK!";
}

async function main() {
  await setupCamera();

  if (!video.srcObject) {
    postureStatus.textContent =
      "Erro: Câmera não inicializada. Recarregue a página.";
    return;
  }

  const detector = await posedetection.createDetector(
    posedetection.SupportedModels.BlazePose,
    {
      runtime: "mediapipe",
      modelType: "full",
    }
  );
  console.log("Detector BlazePose carregado.");

  async function render() {
    const poses = await detector.estimatePoses(video);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let statusMessage = "Nenhuma pessoa detectada.";

    if (poses.length > 0) {
      const pose = poses[0];

      const keypoints = pose.keypoints;

      for (const kp of keypoints) {
        if (kp.score > 0.6) {
          ctx.beginPath();
          ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "lime";
          ctx.fill();
        }
      }

      statusMessage = analyzeSittingPosture(keypoints);
    }

    postureStatus.textContent = statusMessage;
    requestAnimationFrame(render);
  }

  render();
}

main();
