let activeToast: HTMLElement | null = null;

export function showToast(message: string): void {
  // Remove previous toast if present
  if (activeToast) {
    activeToast.remove();
    activeToast = null;
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  activeToast = toast;

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-dismiss after 2s
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => {
      toast.remove();
      if (activeToast === toast) activeToast = null;
    }, { once: true });
  }, 2000);
}
