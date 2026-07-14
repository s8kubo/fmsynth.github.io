let audio;

let carrierOsc;
let modOsc;
let modGain;

let playing = false;


// HTML取得

const carrierSlider = document.getElementById("carrier");
const modSlider = document.getElementById("mod");
const depthSlider = document.getElementById("depth");

const carrierValue = document.getElementById("carrierValue");
const modValue = document.getElementById("modValue");
const depthValue = document.getElementById("depthValue");


// 値更新

function updateValues(){

    carrierValue.textContent = carrierSlider.value;
    modValue.textContent = modSlider.value;
    depthValue.textContent = depthSlider.value;

    if(!playing) return;

    carrierOsc.frequency.value =
        carrierSlider.value;

    modOsc.frequency.value =
        modSlider.value;

    modGain.gain.value =
        depthSlider.value;

}


// シンセ作成

function createSynth(){

    audio = new AudioContext();

    carrierOsc =
        audio.createOscillator();

    modOsc =
        audio.createOscillator();

    modGain =
        audio.createGain();


    // FM

    modOsc.connect(modGain);

    modGain.connect(
        carrierOsc.frequency
    );


    carrierOsc.connect(
        audio.destination
    );

    updateValues();

    carrierOsc.start();

    modOsc.start();

}

// PLAY

document
.getElementById("play")
.onclick=()=>{

    if(playing) return;

    createSynth();

    playing=true;

};


// STOP

document
.getElementById("stop")
.onclick=()=>{

    if(!playing) return;

    carrierOsc.stop();

    modOsc.stop();

    audio.close();

    playing=false;

};


// スライダー

carrierSlider.oninput =
updateValues;

modSlider.oninput =
updateValues;

depthSlider.oninput =
updateValues;
