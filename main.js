import { initAudioSystem, updateAudio, resumeAudioContext } from './audio.js';
import { initializeInterface, hideStartButton, addStartButtonListener } from './interface.js';

function onFrequencyChange(newFrequency) {
    updateAudio(newFrequency);
}

function startRadio() {
    initAudioSystem().then(() => {
        resumeAudioContext().then(() => {
            console.log('Audio context started');
            hideStartButton();
            updateAudio(88.0); // Start at the initial frequency
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initializeInterface(onFrequencyChange);
    addStartButtonListener(startRadio);
});