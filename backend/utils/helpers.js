// === Save auth data to localStorage ===
export const authenticate = (data, next) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwt', JSON.stringify(data));
    next();
  }
};

// === Get user info from localStorage ===
export const getUser = () => {
  if (typeof window === 'undefined') return null;
  const storedData = localStorage.getItem('jwt');
  if (storedData) {
    try {
      return JSON.parse(storedData);
    } catch (err) {
      console.error("Error parsing stored user data:", err);
      return null;
    }
  }
  return null;
};

// === Check if user is authenticated ===
export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  const storedData = localStorage.getItem('jwt');
  return storedData ? JSON.parse(storedData) : false;
};

// === Remove user info from localStorage (logout) ===
export const logout = (next) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwt');
    next();
  }
};
