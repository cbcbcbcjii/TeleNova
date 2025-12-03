// Утилиты

function showError(message) {
  alert(`❌ ${message}`);
}

function showSuccess(message) {
  alert(`✅ ${message}`);
}

function getUser() {
  return JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || '{}');
}

function saveUser(user) {
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(CONFIG.USER_KEY);
  window.location.href = 'index.html';
}

function checkAuth(requiredRole) {
  const user = getUser();

  if (!user.id) {
    window.location.href = 'index.html';
    return false;
  }

  if (requiredRole && user.type !== requiredRole) {
    window.location.href = 'index.html';
    return false;
  }

  return true;
}
