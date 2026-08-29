// Brand Slider logic for animated gradient progress
export function initBrandSlider() {
  const container = document.querySelector('.brand-slider-container');
  if (!container) return;
  const slider = container.querySelector('.brand-slider');
  const progress = container.querySelector('.brand-slider-progress');
  const valueDisplay = container.querySelector('.brand-slider-value');

  function updateSlider() {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const percent = ((val - min) / (max - min)) * 100;
    progress.style.width = percent + '%';
    valueDisplay.textContent = val;
  }

  slider.addEventListener('input', updateSlider);
  // Animate on load
  setTimeout(updateSlider, 10);
}
