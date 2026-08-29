/**
 * @jest-environment jsdom
 */

import { calculatePoints, createSliders, initApp } from './app';

// Mock Chart.js to prevent errors
const mockChartUpdate = jest.fn();
const mockChart = {
  update: mockChartUpdate,
  data: { datasets: [{ data: [] }] }
};

jest.mock('chart.js', () => ({
  Chart: jest.fn().mockImplementation(() => mockChart)
}));

// Mock requestAnimationFrame for smoother test execution
beforeEach(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    cb();
    return 1;
  });
});

afterEach(() => {
  window.requestAnimationFrame.mockRestore();
});

describe('Story Points Calculator', () => {
  // Set up DOM for testing
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="sliders"></div>
      <canvas id="chart"></canvas>
      <button id="calculate-btn">Calculate</button>
      <div id="total-points"></div>
    `;
    
    // Mock getContext for canvas
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({}));
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });
  
  describe('Slider Functionality', () => {
    test('should create sliders with correct initial values', () => {
      const inputs = [
        { label: 'Complexity', weight: 0.5, min: 1, max: 5, value: 3 },
        { label: 'Effort', weight: 0.5, min: 1, max: 5, value: 2 }
      ];
      
      createSliders(inputs);
      
      const sliders = document.querySelectorAll('.brand-slider');
      expect(sliders.length).toBe(2);
      expect(sliders[0].value).toBe('3');
      expect(sliders[1].value).toBe('2');
      
      // Verify progress bar is set correctly for the first slider
      const progressBars = document.querySelectorAll('.brand-slider-progress');
      expect(progressBars[0].style.width).toBe('50%');
    });

    test('should update values when slider is moved', () => {
      const inputs = [
        { label: 'Complexity', weight: 0.5, min: 1, max: 5, value: 3 }
      ];
      
      createSliders(inputs);
      const slider = document.querySelector('.brand-slider');
      const input = document.querySelector('input[type="number"]');
      
      // Simulate slider movement
      slider.value = '5';
      slider.dispatchEvent(new Event('input'));
      
      expect(input.value).toBe('5');
      expect(document.querySelector('.brand-slider-value').textContent).toBe('5');
    });
  });

  describe('calculatePoints', () => {
    test('should calculate total points correctly', () => {
      const inputs = [
        { label: 'Test 1', weight: 0.5, value: 2 },
        { label: 'Test 2', weight: 0.3, value: 3 },
        { label: 'Test 3', weight: 0.2, value: 5 }
      ];
      
      const result = calculatePoints(inputs);
      // Expected: (0.5 * 2) + (0.3 * 3) + (0.2 * 5) = 1 + 0.9 + 1 = 2.9
      expect(result).toBeCloseTo(2.9, 2);
    });
    
    test('should handle empty inputs', () => {
      const result = calculatePoints([]);
      expect(result).toBe(0);
    });
    
    test('should handle inverse values correctly', () => {
      const inputs = [
        { label: 'Normal', weight: 0.5, value: 5 },
        { label: 'Inverse', weight: 0.5, value: 5, inverse: true }
      ];
      
      const result = calculatePoints(inputs);
      // For inverse, we should calculate as (11 - value) * weight
      // Expected: (0.5 * 5) + (0.5 * (11 - 5)) = 2.5 + 3 = 5.5
      expect(result).toBeCloseTo(5.5, 2);
    });
  });
  
  describe('createSliders', () => {
    test('should create slider elements for each input', () => {
      const inputs = [
        { label: 'Test 1', weight: 0.5, value: 3 },
        { label: 'Test 2', weight: 0.3, value: 3 }
      ];
      
      createSliders(inputs);
      
      const sliders = document.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBe(2);
    });
    
    test('should use the correct container ID', () => {
      // Clear previous content
      document.body.innerHTML = `
        <div id="sliders"></div>
        <button id="calculate-btn">Calculate</button>
        <div id="total-points"></div>
      `;
      
      const inputs = [
        { label: 'Test Slider', weight: 1, value: 3 }
      ];
      
      createSliders(inputs);
      
      const container = document.getElementById('sliders');
      expect(container).not.toBeNull();
      expect(container.hasChildNodes()).toBe(true);
      expect(container.querySelector('.slider-wrapper')).not.toBeNull();
    });
    
    test('should set correct initial values for sliders', () => {
      const inputs = [
        { label: 'Test 1', weight: 0.5, value: 5 },
        { label: 'Test 2', weight: 0.3, value: 2 }
      ];
      
      createSliders(inputs);
      
      const sliders = document.querySelectorAll('input[type="range"]');
      expect(sliders[0].value).toBe('5');
      expect(sliders[1].value).toBe('2');
    });
    
    test('should update input value when slider changes', () => {
      const inputs = [
        { label: 'Test 1', weight: 0.5, value: 3 }
      ];
      
      createSliders(inputs);
      
      const slider = document.querySelector('input[type="range"]');
      slider.value = 7;
      slider.dispatchEvent(new Event('input'));
      
      expect(inputs[0].value).toBe('7');
    });
  });
  
  describe('initApp', () => {
    test('should initialize the application with default values', () => {
      initApp();
      
      const sliders = document.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBe(8); // We should have 8 sliders for our 8 inputs
    });
    
    test('should calculate points when button is clicked', () => {
      initApp();
      
      const calculateBtn = document.getElementById('calculate-btn');
      calculateBtn.click();
      
      const totalPoints = document.getElementById('total-points');
      expect(totalPoints.textContent).toContain('Total Points:');
    });
  });
});
