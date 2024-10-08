import { stations } from './audio.js';

// UI Elements
const frequencyDisplay = document.getElementById('frequency-display');
const tunerScale = document.getElementById('tuner-scale');
const tunerRuler = document.getElementById('tuner-ruler');
const startRadioButton = document.getElementById('start-radio');


// UI Variables
let currentFrequency = 88.0;
const minFrequency = 88.0;
const maxFrequency = 108.0;
const totalMarks = (maxFrequency - minFrequency) * 10; // 10 marks per MHz
const scaleWidth = totalMarks * 12; // 15px per mark

// Dragging state
let isDragging = false;
let startX, startScrollLeft;
let currentX, currentScrollLeft;
let animationFrameId = null;

// Inertia variables
let velocity = 0;
const friction = 0.95;
const minVelocity = 0.1;


export function createTunerScale() {
    const scaleElement = document.getElementById('tuner-scale');
    const longMarkInterval = 10; // Every 1 MHz

    for (let i = 0; i <= totalMarks; i++) {
        const mark = document.createElement('div');
        mark.className = 'scale-mark';
        if (i % longMarkInterval === 0) {
            mark.className += ' long';
            const label = document.createElement('div');
            label.className = 'scale-label';
            const frequency = minFrequency + (i / 10);
            label.textContent = frequency.toFixed(1);
            label.style.left = `${i * 12}px`; // 20px per mark
            scaleElement.appendChild(label);
        }
        scaleElement.appendChild(mark);
    }

    scaleElement.style.width = `${scaleWidth}px`;
}

function frequencyToPosition(frequency) {
    return (frequency - minFrequency) / (maxFrequency - minFrequency) * scaleWidth;
}

function isValidFrequency(frequency) {
    const tolerance = 0.09; // MHz  
    return stations.some(station => Math.abs(frequency - station.centerFreq) < tolerance);
}

function positionToFrequency(position) {
    return minFrequency + (position / scaleWidth) * (maxFrequency - minFrequency);
}

export function updateFrequency(position) {
    const viewportWidth = tunerRuler.offsetWidth;

    // Calculate the position range that allows full frequency access
    const minPosition = -frequencyToPosition(maxFrequency) + viewportWidth / 2;
    const maxPosition = -frequencyToPosition(minFrequency) + viewportWidth / 2;

    // Constrain the position to allow full frequency range access
    let newPosition = Math.max(minPosition, Math.min(maxPosition, position));

    tunerScale.style.transform = `translateX(${newPosition}px)`;

    // Calculate frequency based on the center of the viewport
    const centerOffset = -newPosition + (viewportWidth / 2);
    currentFrequency = positionToFrequency(centerOffset);

    // Clamp the frequency to the valid range
    currentFrequency = Math.max(minFrequency, Math.min(maxFrequency, currentFrequency));

    frequencyDisplay.textContent = currentFrequency.toFixed(1) + ' MHz';

    // Update frequency display
    if (isValidFrequency(currentFrequency)) {
        frequencyDisplay.classList.add('on');
    } else {
        frequencyDisplay.classList.remove('on');
    }

    return currentFrequency;
}

function handleStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    startScrollLeft = parseFloat(tunerScale.style.transform.replace('translateX(', '')) || 0;
    currentX = startX;
    currentScrollLeft = startScrollLeft;
    velocity = 0;
    cancelAnimationFrame(animationFrameId);
}

function handleMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const dx = x - currentX;
    currentX = x;
    const newPosition = currentScrollLeft + dx;
    currentScrollLeft = newPosition;
    velocity = dx;
    return updateFrequency(newPosition);
}

function handleEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    
    // Add this block to handle touch events differently
    if (e.type === 'touchend') {
        const touchThreshold = 2; // pixels
        if (Math.abs(velocity) < touchThreshold) {
            velocity = 0;
            smoothScroll();
            return;
        }
    }
    
    applyInertia();
}

function applyInertia() {
    if (Math.abs(velocity) < minVelocity) {
        smoothScroll();
        return;
    }

    velocity *= friction;
    currentScrollLeft += velocity;
    updateFrequency(currentScrollLeft);

    animationFrameId = requestAnimationFrame(applyInertia);
}

function smoothScroll() {
    const currentPosition = parseFloat(tunerScale.style.transform.replace('translateX(', '')) || 0;
    const viewportWidth = tunerRuler.offsetWidth;
    const centerOffset = -currentPosition + (viewportWidth / 2);

    // Calculate the current frequency based on position
    let currentFreq = positionToFrequency(centerOffset);

    // Round to the nearest 0.1 MHz
    const targetFreq = Math.round(currentFreq * 10) / 10;

    // Convert target frequency back to position
    const targetPosition = -frequencyToPosition(targetFreq) + viewportWidth / 2;

    const diff = targetPosition - currentPosition;

    if (Math.abs(diff) > 0.5) {
        const newPosition = currentPosition + diff * 0.3; // Increased speed for smoother snapping
        updateFrequency(newPosition);
        animationFrameId = requestAnimationFrame(smoothScroll);
    } else {
        // Ensure we snap exactly to the target position
        updateFrequency(targetPosition);
    }
}

export function initializeInterface(onFrequencyChange) {
    createTunerScale();
    const initialOffset = -frequencyToPosition(88.0) + tunerRuler.offsetWidth / 2;
    updateFrequency(initialOffset);

    document.addEventListener('mousedown', handleStart);
    document.addEventListener('touchstart', handleStart, { passive: false });

    document.addEventListener('mousemove', (e) => {
        const newFrequency = handleMove(e);
        if (newFrequency) onFrequencyChange(newFrequency);
    });
    document.addEventListener('touchmove', (e) => {
        const newFrequency = handleMove(e);
        if (newFrequency) onFrequencyChange(newFrequency);
    }, { passive: false });

    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    // Prevent default behavior on the tuner
    tunerRuler.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    tunerRuler.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    tunerRuler.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
}

export function hideStartButton() {
    startRadioButton.style.display = 'none';
}

export function addStartButtonListener(callback) {
    startRadioButton.addEventListener('click', callback);
}