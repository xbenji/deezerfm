// UI Elements
const frequencyDisplay = document.getElementById('frequency-display');
const tunerRuler = document.getElementById('tuner-ruler');
const tunerIndicator = document.getElementById('tuner-indicator');
const startRadioButton = document.getElementById('start-radio');

// UI Variables
let isDragging = false;
let currentFrequency = 88.0;
const minFrequency = 88.0;
const maxFrequency = 108.0;

// Audio System Variables
let audioContext;
let masterGainNode;
let lowpassFilter;
let noiseProcessor;
let noiseGainNode;
let crackleGainNode;
let noiseLowpassFilter;
let distortionNodes = new Map();


const stations = [
    { minFreq: 88.1, maxFreq: 89.1, centerFreq: 88.6, url: 'https://cdn-preview-7.dzcdn.net/stream/c-7d29f91f6875494c4104a0c436581293-9.mp3' },
    { minFreq: 88.7, maxFreq: 89.5, centerFreq: 89.1, url: 'https://cdn-preview-f.dzcdn.net/stream/c-f05a8997d71daf74eafe02b6e8f5a70d-3.mp3' },
    { minFreq: 92.1, maxFreq: 94.1, centerFreq: 92.0, url: 'https://cdn-preview-b.dzcdn.net/stream/c-b01196ead36bde3feb73981f0e3a7926-1.mp3' },
    { minFreq: 95.1, maxFreq: 97.1, centerFreq: 96.5, url: 'https://cdn-preview-7.dzcdn.net/stream/c-7860662c366d9725dc734908cedcf948-2.mp3' },
    { minFreq: 96.6, maxFreq: 98.9, centerFreq: 98.0, url: 'https://cdn-preview-9.dzcdn.net/stream/c-9655c46e463961b93d8f9733de00b0d2-6.mp3' },
    { minFreq: 99.1, maxFreq: 99.9, centerFreq: 99.5, url: 'https://cdn-preview-8.dzcdn.net/stream/c-853d19a12a694ccc74b2501acd802500-6.mp3' },
    { minFreq: 100.1, maxFreq: 102.9, centerFreq: 101.5, url: 'https://cdn-preview-e.dzcdn.net/stream/c-e13ff5f840d94463219b5e8399c579c5-1.mp3' },
    { minFreq: 101.6, maxFreq: 103.9, centerFreq: 103.5, url: 'https://cdn-preview-6.dzcdn.net/stream/c-681a1046cb38c82fd090afc132796946-5.mp3' }
    // Add more stations as needed
];

const audioBuffers = new Map();
const audioSources = new Map();
const gainNodes = new Map();


// Add this new map to track loading promises
const loadingPromises = new Map();

// Initialize audio system
async function initAudioSystem() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    noiseGainNode = audioContext.createGain();
    lowpassFilter = audioContext.createBiquadFilter();

    lowpassFilter.type = 'lowpass';
    lowpassFilter.connect(masterGainNode);
    masterGainNode.connect(audioContext.destination);

    createEnhancedNoiseGenerator();
    await preloadAllStations();

    startRadioButton.style.display = 'none';
}

// UI Functions
function updateFrequency(position) {
    const width = tunerRuler.offsetWidth - tunerIndicator.offsetWidth;
    currentFrequency = minFrequency + (position / width) * (maxFrequency - minFrequency);
    frequencyDisplay.textContent = currentFrequency.toFixed(1) + ' MHz';
    
    if (audioContext) {
        updateAudio(currentFrequency);
    }
}

function setIndicatorPosition(clientX) {
    const rect = tunerRuler.getBoundingClientRect();
    let newLeft = clientX - rect.left - tunerIndicator.offsetWidth / 2;
    newLeft = Math.max(0, Math.min(newLeft, tunerRuler.offsetWidth - tunerIndicator.offsetWidth));
    tunerIndicator.style.left = newLeft + 'px';
    updateFrequency(newLeft);
}

function handleStart(e) {
    isDragging = true;
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    setIndicatorPosition(clientX);
}

function handleMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    setIndicatorPosition(clientX);
}

function handleEnd() {
    isDragging = false;
}

// Audio System Functions
function createEnhancedNoiseGenerator() {
    const bufferSize = 4096;
    
    noiseProcessor = audioContext.createScriptProcessor(bufferSize, 1, 2);
    noiseGainNode = audioContext.createGain();
    crackleGainNode = audioContext.createGain();
    noiseLowpassFilter = audioContext.createBiquadFilter();

    noiseLowpassFilter.type = 'lowpass';
    noiseLowpassFilter.frequency.setValueAtTime(2000, audioContext.currentTime); // Fixed frequency


    let lastOut = 0;
    noiseProcessor.onaudioprocess = function(e) {
        const outputL = e.outputBuffer.getChannelData(0);
        const outputR = e.outputBuffer.getChannelData(1);
        for (let i = 0; i < bufferSize; i++) {
            // Generate colored noise (mix of white, pink, and brown noise)
            const white = Math.random() * 2 - 1;
            const pink = (lastOut + (0.02 * white)) / 1.02;
            const brown = (lastOut + (0.1 * white)) / 1.1;
            
            lastOut = (white * 0.4 + pink * 0.4 + brown * 0.2);

            // Add subtle stereo effect
            outputL[i] = lastOut;
            outputR[i] = lastOut * 0.9 + (Math.random() * 2 - 1) * 0.1;

            // Add more prominent crackles
            if (Math.random() < 0.005) {  // Increased probability
                const crackleIntensity = Math.random() * 0.5 + 3.5;  // Stronger effect
                outputL[i] += (Math.random() - 0.5) * crackleIntensity;
                outputR[i] += (Math.random() - 0.5) * crackleIntensity;
            }
        }
    };  

    noiseProcessor.connect(noiseGainNode);
    noiseProcessor.connect(crackleGainNode);
    noiseGainNode.connect(noiseLowpassFilter);
    noiseLowpassFilter.connect(audioContext.destination);
    crackleGainNode.connect(audioContext.destination);

    // Subtle amplitude modulation for signal fading effect
    const fadeOsc = audioContext.createOscillator();
    const fadeGain = audioContext.createGain();
    fadeOsc.frequency.setValueAtTime(0.1, audioContext.currentTime); // Slow oscillation
    fadeOsc.connect(fadeGain);
    fadeGain.gain.setValueAtTime(0.03, audioContext.currentTime); // Subtle effect
    fadeGain.connect(noiseGainNode.gain);
    fadeOsc.start();
}

function updateNoise(signalStrength) {
    const noiseGain = Math.max(0, 1 - signalStrength ** 2);
    noiseGainNode.gain.setTargetAtTime(noiseGain, audioContext.currentTime, 0.3);
    
    // Adjust crackle intensity
    const crackleIntensity = Math.max(0, 0.2 - signalStrength * 0.2);
    crackleGainNode.gain.setTargetAtTime(crackleIntensity, audioContext.currentTime, 0.3);
}

function createDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; ++i) {
        const x = i * 2 / samples - 1;
        curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

async function loadAudio(url) {
    if (audioBuffers.has(url)) {
        return audioBuffers.get(url);
    }
    
    if (loadingPromises.has(url)) {
        return loadingPromises.get(url);
    }
    
    const loadPromise = fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            audioBuffers.set(url, audioBuffer);
            loadingPromises.delete(url);
            return audioBuffer;
        });
    
    loadingPromises.set(url, loadPromise);
    return loadPromise;
}

async function preloadAllStations() {
    const loadPromises = stations.map(station => loadAudio(station.url));
    await Promise.all(loadPromises);
}

async function loadAndPlayStation(station) {
    if (!audioSources.has(station.url)) {
        try {
            const audioBuffer = await loadAudio(station.url);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(0, audioContext.currentTime); // Start muted
            
            const distortionNode = audioContext.createWaveShaper();
            distortionNode.curve = createDistortionCurve(0); // Start with no distortion
            
            const compressorNode = audioContext.createDynamicsCompressor();
            compressorNode.threshold.setValueAtTime(-24, audioContext.currentTime);
            compressorNode.knee.setValueAtTime(30, audioContext.currentTime);
            compressorNode.ratio.setValueAtTime(12, audioContext.currentTime);
            compressorNode.attack.setValueAtTime(0.003, audioContext.currentTime);
            compressorNode.release.setValueAtTime(0.25, audioContext.currentTime);
            
            source.connect(distortionNode)
                  .connect(compressorNode)
                  .connect(gainNode)
                  .connect(audioContext.destination);
            source.start();
            
            audioSources.set(station.url, source);
            gainNodes.set(station.url, gainNode);
            distortionNodes.set(station.url, distortionNode);
        } catch (error) {
            console.error(`Error loading station ${station.url}:`, error);
        }
    }
}

function stopAndUnloadStation(url) {
    if (audioSources.has(url)) {
        const source = audioSources.get(url);
        source.stop();
        source.disconnect();
        audioSources.delete(url);
        gainNodes.delete(url);
    }
}

function getStationsAtFrequency(frequency) {
    return stations.filter(station => frequency >= station.minFreq && frequency <= station.maxFreq);
}

function calculateSignalStrength(frequency, station) {
    const distance = Math.abs(frequency - station.centerFreq);
    const range = (station.maxFreq - station.minFreq) / 2;
    return Math.max(0, 1 - (distance / range) ** 2); // Quadratic falloff for sharper tuning
}

async function updateAudio(frequency) {
    const activeStations = getStationsAtFrequency(frequency);
    
    if (activeStations.length > 0) {
        let totalSignalStrength = 0;
        let maxSignalStrength = 0;

        // Calculate signal strengths and load stations
        for (const station of activeStations) {
            const signalStrength = calculateSignalStrength(frequency, station);
            totalSignalStrength += signalStrength;
            maxSignalStrength = Math.max(maxSignalStrength, signalStrength);
            await loadAndPlayStation(station);
        }

        // Adjust volume and distortion based on signal strength
        for (const [url, gainNode] of gainNodes) {
            const station = activeStations.find(s => s.url === url);
            if (station) {
                const signalStrength = calculateSignalStrength(frequency, station);
                const normalizedStrength = signalStrength / totalSignalStrength;
                
                // Smooth transition for volume
                gainNode.gain.setTargetAtTime(normalizedStrength, audioContext.currentTime, 0.3);
                
                // Apply distortion based on signal strength
                const distortionAmount = Math.max(0, 1 - signalStrength) * 200; // Adjust the multiplier for desired effect
                const distortionNode = distortionNodes.get(url);
                distortionNode.curve = createDistortionCurve(distortionAmount);
            } else {
                gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.3);
            }
        }
        
        // Update noise based on the strongest signal
        updateNoise(maxSignalStrength);
    } else {
        // Full noise when no station is in range
        updateNoise(0);
        for (const gainNode of gainNodes.values()) {
            gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.3);
        }
    }
}

// Event Listeners
tunerRuler.addEventListener('mousedown', handleStart);
tunerRuler.addEventListener('touchstart', handleStart, { passive: false });

document.addEventListener('mousemove', handleMove);
document.addEventListener('touchmove', handleMove, { passive: false });

document.addEventListener('mouseup', handleEnd);
document.addEventListener('touchend', handleEnd);

// Prevent default behavior on the tuner
tunerRuler.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
tunerRuler.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
tunerRuler.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });

// Handle autoplay policy
startRadioButton.addEventListener('click', () => {
    initAudioSystem().then(() => {
        audioContext.resume().then(() => {
            console.log('Audio context started');
            updateAudio(currentFrequency);
        });
    });
});

// Initialize frequency display
updateFrequency(0);