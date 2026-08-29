/**
 * Story Points Calculator
 * A progressive web app for calculating story points in agile development
 */

// Google Analytics event tracking helper
function trackEvent(eventName, eventParams = {}) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, eventParams);
  }
}

// Core application logic
function calculatePoints(inputs) {
  // DEBUG: Print all slider values and types

  // --- Rule-based overrides ---
  const nonInverse = inputs.slice(0, 6).map(i => Number(i.value));
  const inverse = inputs.slice(6).map(i => Number(i.value));

  // 1. Both Unknowns and Dependencies maxed: minimum 21
  if (Number(inputs[4].value) === 5 && Number(inputs[5].value) === 5) {
    // But allow higher if nonlinear logic gives more
    let fib = calcHybridFib(inputs);
    return fib < 21 ? 21 : fib;
  }

  // 2. Business Logic Complexity or Technical Implementation Difficulty maxed: minimum 13
  if (Number(inputs[0].value) === 5 || Number(inputs[1].value) === 5) {
    let fib = calcHybridFib(inputs);
    return fib < 13 ? 13 : fib;
  }

  // 3. All sliders are 3: return 5
  if (inputs.every(input => Number(input.value) === 3)) {
    return 5;
  }

  // 4. All non-inverse 1, all inverse 5: return 1 (minimum)
  if (nonInverse.every(v => v === 1) && inverse.every(v => v === 5)) {
    return 1;
  }

  // 5. All non-inverse 5, all inverse 1: return 34 (maximum)
  if (nonInverse.every(v => v === 5) && inverse.every(v => v === 1)) {
    return 34;
  }

  // 6. If Unknowns or Dependencies are maxed, minimum is 8
  if (Number(inputs[4].value) === 5 || Number(inputs[5].value) === 5) {
    let fib = calcHybridFib(inputs);
    return fib < 8 ? 8 : fib;
  }

  // --- Default nonlinear hybrid logic ---
  return calcHybridFib(inputs);
}

// Helper for nonlinear normalization and mapping
function calcHybridFib(inputs) {
  let sum = 0;
  for (let i = 0; i < inputs.length; i++) {
    let v = inputs[i].inverse ? 6 - Number(inputs[i].value) : Number(inputs[i].value);
    sum += Math.pow(v, 1.7);
  }
  // Normalize: min = all 1s (or inv 5), max = all 5s (or inv 1)
  const minSum = Math.pow(1, 1.7) * 6 + Math.pow(5, 1.7) * 2;
  const maxSum = Math.pow(5, 1.7) * 6 + Math.pow(1, 1.7) * 2;
  const norm = (sum - minSum) / (maxSum - minSum);

  // Map to Fibonacci
  if (norm <= 0.05) return 1;
  if (norm <= 0.15) return 2;
  if (norm <= 0.30) return 3;
  if (norm <= 0.48) return 5;
  if (norm <= 0.65) return 8;
  if (norm <= 0.80) return 13;
  if (norm <= 0.93) return 21;
  return 34;
}

/**
 * Convert raw score to Fibonacci sequence for story points
 * @param {number} score - The raw calculated score
 * @returns {number} - The Fibonacci story point value
 */
function scoreToFibonacci(score) {
  if (score <= 1) return 1;
  if (score <= 2) return 2;
  if (score <= 3.5) return 3;
  if (score <= 5.5) return 5;
  if (score <= 9) return 8;
  if (score <= 14) return 13;
  if (score <= 21) return 21;
  return 34;
}

/**
 * Convert story points to T-shirt size
 * @param {number} points - The story points value
 * @returns {string} - The T-shirt size (XS, S, M, L, XL, XXL, Epic)
 */
function pointsToTShirt(points) {
  if (points <= 2) return "XS";
  if (points === 3) return "S";
  if (points === 5) return "M";
  if (points === 8) return "L";
  if (points === 13) return "XL";
  if (points === 21) return "XXL";
  return "Epic";
}

/**
 * Create slider elements for each input factor
 * @param {Array} inputs - Array of input objects with label, weight, and value properties
 */
function createSliders(inputs) {
  if (!inputs) return;
  
  const container = document.getElementById("sliders");
  if (!container) return;
  
  container.innerHTML = "";

  const labels = [
    "🔧 Business Logic Complexity",
    "🧱 Technical Implementation Difficulty",
    "🕒 Amount of Work",
    "👥 Team Collaboration Required",
    "❓ Unknowns and Ambiguity",
    "🔗 External Dependencies",
    "🧠 Familiarity with Task",
    "📃 Clarity of Requirements"
  ];
  
  const descriptions = [
    "How complex is the decision-making or data handling in this task?",
    "How hard will it be to technically build or architect the solution?",
    "How many components, modules, or screens need to be built?",
    "How many people need to sync or collaborate closely for this?",
    "How unclear or risky is this task due to lack of information?",
    "Are we waiting on vendors, APIs, or approvals?",
    "How confident are we in how to do this task? (Lower = less confident)",
    "How well are the requirements documented and understood? (Lower = unclear)"
  ];

  inputs.forEach((input, index) => {
    // Update input label from our predefined labels
    input.label = labels[index] || `Factor ${index + 1}`;
    // Ensure last two sliders are always inverse
    if (index >= 6) input.inverse = true;
    
    const wrapper = document.createElement("div");
    wrapper.className = "slider-wrapper";

    const label = document.createElement('label');
    label.htmlFor = `slider-${index}`;
    const labelText = document.createTextNode(`${input.label}: `);
    const valueSpan = document.createElement('span');
    valueSpan.className = 'slider-label-value'; // New class for styling if needed
    valueSpan.textContent = `(${input.value})`; // Initial value
    label.appendChild(labelText);
    label.appendChild(valueSpan);

    const desc = document.createElement("div");
    desc.className = "description";
    desc.innerText = descriptions[index] || "";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 1;
    slider.max = 5;
    slider.value = input.value || 3;
    slider.step = 1;
    slider.id = `slider-${index}`;
    slider.className = "brand-slider";
    
    // --- Begin new brand slider markup ---
    const brandSliderContainer = document.createElement('div');
    brandSliderContainer.className = 'brand-slider-container';
    brandSliderContainer.style.width = '100%';

    const track = document.createElement('div');
    track.className = 'brand-slider-track';
    brandSliderContainer.appendChild(track);

    const progress = document.createElement('div');
    progress.className = 'brand-slider-progress';
    progress.style.width = '0';
    brandSliderContainer.appendChild(progress);

    brandSliderContainer.appendChild(slider);

    // JS logic for updating progress and value
    function updateBrandSlider() {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const percent = ((val - min) / (max - min)) * 100;
      // Set CSS vars for progress bar to stop at thumb center
      brandSliderContainer.setAttribute('data-progress', '1');
      brandSliderContainer.style.setProperty('--progress', percent + '%');
      brandSliderContainer.style.setProperty('--progress-num', percent);
      // Update the value span within the label
      valueSpan.textContent = `(${val})`;
      input.value = val;
      if (typeof calculateAndUpdate === 'function' && window._chart && window._inputs) {
        calculateAndUpdate(window._inputs, window._chart);
      }
    }
    slider.addEventListener('input', updateBrandSlider);
    setTimeout(updateBrandSlider, 10);
    // Keep slider/input/valueDisplay in sync on load
    slider.value = input.value;
    const percent = ((input.value - slider.min) / (slider.max - slider.min)) * 100;
    brandSliderContainer.setAttribute('data-progress', '1');
    brandSliderContainer.style.setProperty('--progress', percent + '%');
    brandSliderContainer.style.setProperty('--progress-num', percent);
    // --- End new brand slider markup ---

    wrapper.appendChild(label);
    wrapper.appendChild(desc);
    wrapper.appendChild(brandSliderContainer);

    container.appendChild(wrapper);
  });
}

/**
 * Create a chart to visualize the contribution of each factor
 * @param {Array} inputs - Array of input objects with label, weight, and value properties
 * @returns {Object} - The Chart.js chart instance
 */
function createChart(inputs) {
  try {
    
    // Check if we're in a browser environment
    if (typeof document === 'undefined') {
      console.warn('Not in browser environment');
      return null;
    }
    
    const chartElement = document.getElementById("chart");
    if (!chartElement) {
      console.error('Chart element not found');
      return null;
    }
    
    const ctx = chartElement.getContext("2d");
    if (!ctx) {
      console.error('Could not get 2D context');
      return null;
    }
    
    // Check if Chart is available
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return {
        update: () => {},
        data: { datasets: [{ data: [] }] }
      };
    }
    
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: inputs.map((input) => input.label),
        datasets: [
          {
            label: "Points",
            data: inputs.map((input) => {
              if (input.inverse) {
                return (6 - input.value) * input.weight * 25; // Scale for 1-5 range
              }
              return input.value * input.weight * 25; // Scale for 1-5 range
            }),
            backgroundColor: "#2563eb",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 400,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "📊 Contribution Breakdown by Factor",
            color: "#2563eb",
            font: {
              size: 16,
              weight: "600",
            },
            padding: {
              top: 10,
              bottom: 20,
            },
          },
          tooltip: {
            callbacks: {
              title: (ctx) => inputs[ctx[0].dataIndex]?.label || "",
              label: (ctx) => `${parseFloat(ctx.formattedValue).toFixed(1)} pts`,
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 20 },
          },
        },
      },
    });
    return chart;
  } catch (error) {
    console.error("Error creating chart:", error);
    // Return a mock chart for testing
    return {
      update: () => {},
      data: { datasets: [{ data: [] }] }
    };
  }
}

/**
 * Update the results display with the calculated story points
 * @param {number} score - The raw calculated score
 */
function updateResults(score) {
  try {
    
    // Convert to Fibonacci sequence
    const storyPoints = scoreToFibonacci(score);
    const tshirtSize = pointsToTShirt(storyPoints);
    
    
    // Update desktop results
    const rangeElement = document.getElementById("range");
    const tshirtElement = document.getElementById("tshirt");
    
    if (rangeElement) {
      rangeElement.textContent = storyPoints;
    }
    
    if (tshirtElement) {
      tshirtElement.textContent = tshirtSize;
      tshirtElement.className = "result-value tshirt-" + tshirtSize.toLowerCase();
    }
    
    // Update mobile results
    const rangeMobile = document.getElementById("range-mobile");
    const tshirtMobile = document.getElementById("tshirt-mobile");
    
    if (rangeMobile) {
      rangeMobile.textContent = storyPoints;
    }
    
    if (tshirtMobile) {
      tshirtMobile.textContent = tshirtSize;
    }
    
    // Update total points display for testing
    const totalPoints = document.getElementById("total-points");
    if (totalPoints) {
      totalPoints.textContent = `Total Points: ${score.toFixed(1)} → ${storyPoints}`;
    }
  } catch (error) {
    console.error('Error in updateResults:', error);
  }
}

/**
 * Calculate story points and update the UI
 * @param {Array} inputs - Array of input objects with label, weight, and value properties
 * @param {Object} chart - The Chart.js chart instance
 */
function calculateAndUpdate(inputs, chart) {
  try {

    // Calculate the raw score (weighted average mapped directly)
    const baseScore = calculatePoints(inputs);

    // Use baseScore directly for story points mapping
    const storyPoints = scoreToFibonacci(baseScore);
    
    // Track story point calculation event
    trackEvent('calculate_story_points', {
      'story_points': storyPoints,
      'raw_score': baseScore
    });

    // Update the results display
    updateResults(baseScore);
    
    // Update the chart if it exists
    if (chart) {
      // Calculate each factor's contribution to the final score
      const maxPossible = inputs.reduce((sum, input) => sum + (5 * input.weight), 0);
      
      chart.data.datasets[0].data = inputs.map(input => {
        const value = input.inverse ? (6 - input.value) : input.value;
        // Calculate percentage of maximum possible contribution
        const contribution = (value * input.weight) / maxPossible * 100;
        return Math.round(contribution * 10) / 10; // One decimal place
      });
      
      // Ensure the chart updates smoothly
      chart.update();
    }
    
    return storyPoints;
  } catch (error) {
    console.error('Error in calculateAndUpdate:', error);
    return 0;
  }
}

/**
 * Initialize the application
 */
function initApp() {
  // Info modal logic
  if (typeof document !== 'undefined') {
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeInfoModal = document.getElementById('close-info-modal');
    if (infoBtn && infoModal && closeInfoModal) {
      infoBtn.onclick = () => {
        infoModal.style.display = 'flex';
        // Trap focus
        infoModal.setAttribute('tabindex', '-1');
        infoModal.focus();
      };
      closeInfoModal.onclick = () => infoModal.style.display = 'none';
      infoModal.onclick = (e) => {
        if (e.target === infoModal) infoModal.style.display = 'none';
      };
      infoModal.onkeydown = (e) => {
        if (e.key === 'Escape') infoModal.style.display = 'none';
      };
    }
  }
  // Define the input factors for the estimator, matching the scoring logic and slider labels
  const inputs = [
    { label: "🔧 Business Logic Complexity", weight: 0.13, value: 1 },
    { label: "🧱 Technical Implementation Difficulty", weight: 0.13, value: 1 },
    { label: "🕒 Amount of Work", weight: 0.13, value: 1 },
    { label: "👥 Team Collaboration Required", weight: 0.13, value: 1 },
    { label: "❓ Unknowns and Ambiguity", weight: 0.13, value: 1 },
    { label: "🔗 External Dependencies", weight: 0.13, value: 1 },
    { label: "🧠 Familiarity with Task", weight: 0.11, value: 1, inverse: true },
    { label: "📃 Clarity of Requirements", weight: 0.11, value: 1, inverse: true },
  ];

  // Create the UI elements
  createSliders(inputs);
  const chart = createChart(inputs);
  // Set global references for slider sync
  window._inputs = inputs;
  window._chart = chart;
  
  // Initial calculation
  calculateAndUpdate(inputs, chart);

  // Add event listener for the calculate button
  const calculateBtn = document.getElementById("calculate-btn");
  if (calculateBtn) {
    calculateBtn.addEventListener("click", () => {
      calculateAndUpdate(inputs, chart);
    });
  }
  
  // Add event listeners for real-time updates when sliders change
  const sliders = document.querySelectorAll(".slider");
  sliders.forEach(slider => {
    slider.addEventListener("input", () => {
      calculateAndUpdate(inputs, chart);
    }, { passive: true });
  });
}

// Initialize the app only in a browser environment
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initApp();
  });
}

// Make functions available globally for debugging
export { calculatePoints, scoreToFibonacci, pointsToTShirt, createSliders, createChart, updateResults, calculateAndUpdate, initApp };