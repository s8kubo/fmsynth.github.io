let audio;

let carrier;
let mod;
let modGain;

let lfo;
let lfoGain;

let playing=false;

function createSynth(){

    audio=new AudioContext();

    carrier=audio.createOscillator();
    mod=audio.createOscillator();

    modGain=audio.createGain();

    lfo=audio.createOscillator();
    lfoGain=audio.createGain();

    const output=audio.createGain();

    output.gain.value=0.15;

    // FM
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    // Vibrato
    lfo.connect(lfoGain);
    lfoGain.connect(carrier.frequency);

    carrier.connect(output);
    output.connect(audio.destination);

    updateValues();

    carrier.start();
    mod.start();
    lfo.start();
}

function updateValues(){

    let freq=parseFloat(freqSlider.value);
    let ratio=parseFloat(ratioSlider.value);
    let index=parseFloat(indexSlider.value);
    let lfoRate=parseFloat(lfoSlider.value);

    carrier.frequency.value=freq;

    mod.frequency.value=freq*ratio;

    // Index
    modGain.gain.value=index*100;

    // Vibrato
    lfo.frequency.value=lfoRate;
    lfoGain.gain.value=5;

}

const freqSlider=document.getElementById("freq");
const ratioSlider=document.getElementById("ratio");
const indexSlider=document.getElementById("index");
const lfoSlider=document.getElementById("lfo");

freqSlider.oninput=updateValues;
ratioSlider.oninput=updateValues;
indexSlider.oninput=updateValues;
lfoSlider.oninput=updateValues;

document.getElementById("play").onclick=()=>{

    if(!playing){

        createSynth();

        playing=true;

    }

}

document.getElementById("stop").onclick=()=>{

    if(playing){

        carrier.stop();
        mod.stop();
        lfo.stop();

        audio.close();

        playing=false;

    }

}
