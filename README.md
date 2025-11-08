# PostureAnalyzer

Detector simples de postura sentado usando BlazePose (TensorFlow.js + MediaPipe). O projeto captura vídeo da webcam, estima a pose e avalia sinais básicos de má postura (tronco inclinado e cabeça projetada).

## Dependências principais
- @tensorflow/tfjs — runtime do TensorFlow para browser.
- @tensorflow-models/pose-detection — API para detectar poses (usa BlazePose).
- @mediapipe/pose — runtime MediaPipe (quando runtime="mediapipe" em [src/index.js](src/index.js)).

## Arquivos relevantes
- [src/index.js](src/index.js) —> implementação principal do detector e análise de postura.
  - Funções importantes:
    - [`setupCamera`](src/index.js) —> configura a webcam e dimensiona o canvas.
    - [`analyzeSittingPosture`](src/index.js) —> lógica que determina se a postura está correta ou apresenta problemas (tronco inclinado, cabeça projetada).
    - [`main`](src/index.js) —> inicializa câmera, modelo e loop de renderização.
- [src/front/index.html](src/front/index.html) —> interface front-end com <video>, <canvas> e área de status.

## Como rodar (desenvolvimento)
1. Instale dependências:
   ```sh
   npm install
   ```