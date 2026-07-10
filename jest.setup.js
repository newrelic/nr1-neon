import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  window.HTMLDialogElement = window.HTMLDialogElement || class {};
  if (!window.HTMLDialogElement.prototype.showModal) {
    window.HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  }
  if (!window.HTMLDialogElement.prototype.close) {
    window.HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  }
}

if (typeof window !== 'undefined' && !window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
if (typeof global !== 'undefined' && !global.ResizeObserver) {
  global.ResizeObserver = window.ResizeObserver;
}
