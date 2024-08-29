// UI Elements
const frequencyDisplay = document.getElementById('frequency-display');
const tunerScale = document.getElementById('tuner-scale');
const tunerRuler = document.getElementById('tuner-ruler');
const startRadioButton = document.getElementById('start-radio');

// UI Variables
let currentFrequency = 88.0;
const minFrequency = 88.0;
const maxFrequency = 108.0;

// Dragging state
let isDragging = false;
let startX, startScrollLeft;
let animationFrameId = null;

export function createTunerScale() {
    const scaleElement = document.getElementById('tuner-scale');
    const totalMarks = (maxFrequency - minFrequency) * 10; // 10 marks per MHz
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
            label.style.left = `${i * 20}px`; // Adjust based on your mark width + margin
            scaleElement.appendChild(label);
        }
        scaleElement.appendChild(mark);
    }

    // Set the width of the scale
    scaleElement.style.width = `${totalMarks * 20}px`; // Adjust based on your mark width + margin
}

export function updateFrequency(position) {
    const scaleWidth = tunerScale.offsetWidth;
    const viewportWidth = tunerRuler.offsetWidth;
    const maxOffset = scaleWidth - viewportWidth;

    let newPosition = Math.max(-maxOffset, Math.min(0, position));
    
    tunerScale.style.transform = `translateX(${newPosition}px)`;

    const centerOffset = -newPosition + (viewportWidth / 2);
    currentFrequency = minFrequency + (centerOffset / scaleWidth) * (maxFrequency - minFrequency);
    frequencyDisplay.textContent = currentFrequency.toFixed(1) + ' MHz';

    return currentFrequency;
}

function handleStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    startScrollLeft = parseFloat(tunerScale.style.transform.replace('translateX(', '')) || 0;
    tunerRuler.style.cursor = 'grabbing';
    cancelAnimationFrame(animationFrameId);
}

function handleMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.type.includes('mouse') ? e.pageX : e.touches[0].pageX;
    const walk = (x - startX) * 2; // Adjust the multiplier for sensitivity
    const newPosition = startScrollLeft + walk;
    return updateFrequency(newPosition);
}

function handleEnd() {
    isDragging = false;
    tunerRuler.style.cursor = 'grab';
}

function smoothScroll() {
    if (!isDragging) {
        const currentPosition = parseFloat(tunerScale.style.transform.replace('translateX(', '')) || 0;
        const targetPosition = Math.round(currentPosition / 20) * 20; // Snap to nearest mark
        const diff = targetPosition - currentPosition;
        
        if (Math.abs(diff) > 0.5) {
            const newPosition = currentPosition + diff * 0.1;
            updateFrequency(newPosition);
            animationFrameId = requestAnimationFrame(smoothScroll);
        }
    }
}

export function initializeInterface(onFrequencyChange) {
    createTunerScale();
    const initialOffset = (tunerRuler.offsetWidth / 2) - (minFrequency * 20 * 10); // Center 88.0 MHz
    updateFrequency(-initialOffset);

    tunerRuler.addEventListener('mousedown', handleStart);
    tunerRuler.addEventListener('touchstart', handleStart, { passive: false });

    document.addEventListener('mousemove', (e) => {
        const newFrequency = handleMove(e);
        if (newFrequency) onFrequencyChange(newFrequency);
    });
    document.addEventListener('touchmove', (e) => {
        const newFrequency = handleMove(e);
        if (newFrequency) onFrequencyChange(newFrequency);
    }, { passive: false });

    document.addEventListener('mouseup', () => {
        handleEnd();
        smoothScroll();
    });
    document.addEventListener('touchend', () => {
        handleEnd();
        smoothScroll();
    });

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
