"use strict";

const carrierFrequency =
  document.querySelector("#carrier-frequency");

const carrierFrequencyValue =
  document.querySelector("#carrier-frequency-value");

const carrierWave =
  document.querySelector("#carrier-wave");

const modulatorFrequency =
  document.querySelector("#modulator-frequency");

const modulatorFrequencyValue =
  document.querySelector("#modulator-frequency-value");

const modulatorWave =
  document.querySelector("#modulator-wave");

const modulationDepth =
  document.querySelector("#modulation-depth");

const modulationDepthValue =
  document.querySelector("#modulation-depth-value");

const playButton =
  document.querySelector("#play-button");

const canvas =
  document.querySelector("#oscilloscope");

const canvasContext =
  canvas.getContext("2d");

let audioContext = null;
let carrierOscillator = null;
let modulatorOscillator = null;
let modulationGain = null;
let masterGain = null;
let analyser = null;

let waveformData = null;
let animationFrameId = null;
let isPlaying = false;

function updateValues() {
  carrierFrequencyValue.textContent =
    `${Number(carrierFrequency.value).toFixed(0)} Hz`;

  modulatorFrequencyValue.textContent =
    `${Number(modulatorFrequency.value).toFixed(1)} Hz`;

  modulationDepthValue.textContent =
    `${Number(modulationDepth.value).toFixed(0)} Hz`;
}

function createAudioContext() {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      "このブラウザーはWeb Audio APIに対応していません。"
    );
  }

  return new AudioContextClass();
}

function setSmoothly(audioParameter, value) {
  if (!audioContext || !audioParameter) {
    return;
  }

  const now = audioContext.currentTime;

  audioParameter.cancelScheduledValues(now);
  audioParameter.setTargetAtTime(value, now, 0.01);
}

function resizeCanvas() {
  const pixelRatio =
    window.devicePixelRatio || 1;

  const width =
    canvas.clientWidth;

  const height =
    canvas.clientHeight;

  const internalWidth =
    Math.floor(width * pixelRatio);

  const internalHeight =
    Math.floor(height * pixelRatio);

  if (
    canvas.width !== internalWidth ||
    canvas.height !== internalHeight
  ) {
    canvas.width = internalWidth;
    canvas.height = internalHeight;
  }

  canvasContext.setTransform(
    pixelRatio,
    0,
    0,
    pixelRatio,
    0,
    0
  );
}

function clearCanvas() {
  resizeCanvas();

  canvasContext.clearRect(
    0,
    0,
    canvas.clientWidth,
    canvas.clientHeight
  );
}

function drawIdleWave() {
  clearCanvas();

  const width =
    canvas.clientWidth;

  const height =
    canvas.clientHeight;

  canvasContext.strokeStyle = "#000";
  canvasContext.lineWidth = 1;
  canvasContext.beginPath();

  canvasContext.moveTo(
    0,
    height / 2
  );

  canvasContext.lineTo(
    width,
    height / 2
  );

  canvasContext.stroke();
}

function drawWaveform() {
  if (
    !isPlaying ||
    !analyser ||
    !waveformData
  ) {
    return;
  }

  animationFrameId =
    requestAnimationFrame(drawWaveform);

  analyser.getByteTimeDomainData(
    waveformData
  );

  clearCanvas();

  const width =
    canvas.clientWidth;

  const height =
    canvas.clientHeight;

  canvasContext.strokeStyle = "#000";
  canvasContext.lineWidth = 1;
  canvasContext.beginPath();

  const sliceWidth =
    width / (waveformData.length - 1);

  for (
    let index = 0;
    index < waveformData.length;
    index += 1
  ) {
    const normalized =
      waveformData[index] / 128;

    const x =
      index * sliceWidth;

    const y =
      normalized * height / 2;

    if (index === 0) {
      canvasContext.moveTo(x, y);
    } else {
      canvasContext.lineTo(x, y);
    }
  }

  canvasContext.stroke();
}

function buildSynth() {
  carrierOscillator =
    audioContext.createOscillator();

  modulatorOscillator =
    audioContext.createOscillator();

  modulationGain =
    audioContext.createGain();

  masterGain =
    audioContext.createGain();

  analyser =
    audioContext.createAnalyser();

  carrierOscillator.type =
    carrierWave.value;

  carrierOscillator.frequency.value =
    Number(carrierFrequency.value);

  modulatorOscillator.type =
    modulatorWave.value;

  modulatorOscillator.frequency.value =
    Number(modulatorFrequency.value);

  modulationGain.gain.value =
    Number(modulationDepth.value);

  /*
   * 音量は固定。
   * UIからは変更しない。
   */
  masterGain.gain.value = 0.08;

  analyser.fftSize = 2048;

  waveformData =
    new Uint8Array(analyser.fftSize);

  modulatorOscillator.connect(
    modulationGain
  );

  modulationGain.connect(
    carrierOscillator.frequency
  );

  carrierOscillator.connect(
    masterGain
  );

  masterGain.connect(
    analyser
  );

  analyser.connect(
    audioContext.destination
  );

  carrierOscillator.start();
  modulatorOscillator.start();
}

async function startSynth() {
  try {
    if (!audioContext) {
      audioContext =
        createAudioContext();
    }

    if (
      audioContext.state === "suspended"
    ) {
      await audioContext.resume();
    }

    buildSynth();

    isPlaying = true;
    playButton.textContent = "stop";

    drawWaveform();
  } catch (error) {
    console.error(error);

    window.alert(
      error instanceof Error
        ? error.message
        : "音声の再生に失敗しました。"
    );
  }
}

function stopSynth() {
  if (!isPlaying) {
    return;
  }

  carrierOscillator.stop();
  modulatorOscillator.stop();

  carrierOscillator.disconnect();
  modulatorOscillator.disconnect();
  modulationGain.disconnect();
  masterGain.disconnect();
  analyser.disconnect();

  carrierOscillator = null;
  modulatorOscillator = null;
  modulationGain = null;
  masterGain = null;
  analyser = null;
  waveformData = null;

  if (animationFrameId !== null) {
    cancelAnimationFrame(
      animationFrameId
    );

    animationFrameId = null;
  }

  isPlaying = false;
  playButton.textContent = "start";

  drawIdleWave();
}

async function toggleSynth() {
  if (isPlaying) {
    stopSynth();
  } else {
    await startSynth();
  }
}

playButton.addEventListener(
  "click",
  toggleSynth
);

carrierFrequency.addEventListener(
  "input",
  () => {
    updateValues();

    if (carrierOscillator) {
      setSmoothly(
        carrierOscillator.frequency,
        Number(carrierFrequency.value)
      );
    }
  }
);

modulatorFrequency.addEventListener(
  "input",
  () => {
    updateValues();

    if (modulatorOscillator) {
      setSmoothly(
        modulatorOscillator.frequency,
        Number(modulatorFrequency.value)
      );
    }
  }
);

modulationDepth.addEventListener(
  "input",
  () => {
    updateValues();

    if (modulationGain) {
      setSmoothly(
        modulationGain.gain,
        Number(modulationDepth.value)
      );
    }
  }
);

carrierWave.addEventListener(
  "change",
  () => {
    if (carrierOscillator) {
      carrierOscillator.type =
        carrierWave.value;
    }
  }
);

modulatorWave.addEventListener(
  "change",
  () => {
    if (modulatorOscillator) {
      modulatorOscillator.type =
        modulatorWave.value;
    }
  }
);

window.addEventListener(
  "resize",
  () => {
    if (!isPlaying) {
      drawIdleWave();
    }
  }
);

window.addEventListener(
  "beforeunload",
  () => {
    if (audioContext) {
      audioContext.close();
    }
  }
);

updateValues();
drawIdleWave();
