import { initAudioSystem, updateAudio, resumeAudioContext } from './audio.js';
import { initializeInterface, hideStartButton, addStartButtonListener } from './interface.js';

const welcomeScreen = document.getElementById('welcome-screen');
const radioTuner = document.getElementById('radio-tuner');
const startRadioButton = document.getElementById('start-radio');
const loadingIndicator = document.getElementById('loading-indicator');
const progressBar = document.getElementById('progress-bar');
const loadingText = document.getElementById('loading-text');

function onFrequencyChange(newFrequency) {
    updateAudio(newFrequency);
}

async function startRadio() {
    startRadioButton.style.display = 'none';
    loadingIndicator.style.display = 'block';

    try {
        await initAudioSystem(updateLoadingProgress);
        await resumeAudioContext();
        console.log('Audio context started');
        showRadioTuner();
    } catch (error) {
        console.error('Failed to start radio:', error);
        loadingText.textContent = 'Failed to start radio. Please try again.';
    }
}

function updateLoadingProgress(progress) {
    progressBar.style.width = `${progress}%`;
    loadingText.textContent = `Loading: ${progress}%`;
}

function showRadioTuner() {
    welcomeScreen.style.display = 'none';
    radioTuner.style.display = 'block';
    initializeInterface(onFrequencyChange);
    updateAudio(88.0); // Start at the initial frequency
}

document.addEventListener('DOMContentLoaded', () => {
    startRadioButton.addEventListener('click', startRadio);
});