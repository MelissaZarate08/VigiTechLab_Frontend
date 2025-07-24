const BASE_URL = 'https://vigitech-auth.namixcode.cc/api';

export async function registerUser({ name, email, password, role, id_Sistema }) {
  console.log('Register payload:', { name, email, password, role, id_Sistema });

  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, id_Sistema }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return res.json(); 
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

   const { success, token, userName, role, isActive } = await res.json();
   return { success, token, userName, role, isActive };
  }
