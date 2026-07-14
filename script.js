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
