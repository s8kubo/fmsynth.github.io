"use strict";

const carrierFrequency =
  document.querySelector("#carrier-frequency");

const carrierFrequencyValue =
  document.querySelector("#carrier-frequency-value");

const modulatorFrequency =
  document.querySelector("#modulator-frequency");

const modulatorFrequencyValue =
  document.querySelector("#modulator-frequency-value");

const modulationDepth =
  document.querySelector("#modulation-depth");

const modulationDepthValue =
  document.querySelector("#modulation-depth-value");

const carrierWaveRadios =
  document.querySelectorAll(
    'input[name="carrier-wave"]'
  );

const modulatorWaveRadios =
  document.querySelectorAll(
    'input[name="modulator-wave"]'
  );

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

let carrierWaveType = "sine";
let modulatorWaveType = "sine";


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
    window.AudioContext ||
    window.webkitAudioContext;

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

  audioParameter.setTargetAtTime(
    value,
    now,
    0.01
  );
}


function resizeCanvas() {
  const pixelRatio =
    window.devicePixelRatio || 1;

  const displayedWidth =
    canvas.clientWidth;

  const displayedHeight =
    canvas.clientHeight;

  const internalWidth =
    Math.max(
      1,
      Math.floor(displayedWidth * pixelRatio)
    );

  const internalHeight =
    Math.max(
      1,
      Math.floor(displayedHeight * pixelRatio)
    );

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
    carrierWaveType;

  carrierOscillator.frequency.value =
    Number(carrierFrequency.value);

  modulatorOscillator.type =
    modulatorWaveType;

  modulatorOscillator.frequency.value =
    Number(modulatorFrequency.value);

  modulationGain.gain.value =
    Number(modulationDepth.value);

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

  if (animationFrameId !== null) {
    cancelAnimationFrame(
      animationFrameId
    );

    animationFrameId = null;
  }

  try {
    carrierOscillator.stop();
    modulatorOscillator.stop();

    carrierOscillator.disconnect();
    modulatorOscillator.disconnect();

    modulationGain.disconnect();
    masterGain.disconnect();
    analyser.disconnect();
  } catch (error) {
    console.warn(
      "音声ノードの停止に失敗しました。",
      error
    );
  }

  carrierOscillator = null;
  modulatorOscillator = null;

  modulationGain = null;
  masterGain = null;
  analyser = null;

  waveformData = null;

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


carrierWaveRadios.forEach((radio) => {
  radio.addEventListener(
    "change",
    () => {
      carrierWaveType = radio.value;

      if (carrierOscillator) {
        carrierOscillator.type =
          carrierWaveType;
      }
    }
  );
});


modulatorWaveRadios.forEach((radio) => {
  radio.addEventListener(
    "change",
    () => {
      modulatorWaveType = radio.value;

      if (modulatorOscillator) {
        modulatorOscillator.type =
          modulatorWaveType;
      }
    }
  );
});


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


playButton.addEventListener(
  "click",
  toggleSynth
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
