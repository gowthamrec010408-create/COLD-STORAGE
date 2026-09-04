/**
 * QORA TECH — UI Utilities & Toast Alerts
 */

export function showToast(message, type = 'normal') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="${type === 'error' ? 'alert-triangle' : type === 'success' ? 'check-circle' : 'info'}" class="icon-xs ${type === 'error' ? 'text-rose' : type === 'success' ? 'text-emerald' : 'text-cyan'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
