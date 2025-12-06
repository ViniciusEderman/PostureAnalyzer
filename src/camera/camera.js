// Camera setup and management
export async function setupCamera(canvas, postureStatus) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById("video");
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
