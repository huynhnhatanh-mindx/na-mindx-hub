const fs = require('fs');
const path = require('path');

// 1. Update Backend (index.ts)
const backendPath = path.join(__dirname, '../backend/src/index.ts');
let backendContent = fs.readFileSync(backendPath, 'utf8');

// Update verifySecureToken function
const oldVerifyToken = `function verifySecureToken(token: string): { username: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const index = decoded.lastIndexOf('|');
    if (index === -1) return null;

    const payload = decoded.substring(0, index);
    const signature = decoded.substring(index + 1);

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) {
      return null;
    }

    const parts = payload.split(':');
    if (parts.length < 2) return null;
    return { username: parts[0], role: parts[1] };
  } catch (e) {
    return null;
  }
}`;

const newVerifyToken = `function verifySecureToken(token: string): { username: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const index = decoded.lastIndexOf('|');
    if (index === -1) return null;

    const payload = decoded.substring(0, index);
    const signature = decoded.substring(index + 1);

    const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
    if (signature !== expectedSignature) {
      return null;
    }

    const parts = payload.split(':');
    if (parts.length < 3) return null;
    
    // Check expiration (24 hours)
    const tokenTime = parseInt(parts[2], 10);
    const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms
    if (Date.now() - tokenTime > EXPIRATION_TIME) {
      return null;
    }

    return { username: parts[0], role: parts[1] };
  } catch (e) {
    return null;
  }
}`;

if (backendContent.includes(oldVerifyToken)) {
  backendContent = backendContent.replace(oldVerifyToken, newVerifyToken);
  fs.writeFileSync(backendPath, backendContent, 'utf8');
  console.log('Backend updated successfully.');
} else {
  console.log('Could not find oldVerifyToken in backend.');
}

// 2. Update Frontend (AdminDashboard.tsx)
const frontendPath = path.join(__dirname, '../frontend/src/pages/AdminDashboard.tsx');
let frontendContent = fs.readFileSync(frontendPath, 'utf8');

if (!frontendContent.includes('const fetchWithAuth = async')) {
  const fetchWithAuthDef = `  const fetchWithAuth = async (url: string, options: any = {}) => {
    const res = await fetch(url, options);
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('storage'));
      navigate('/login');
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    return res;
  };

  const getHeaders = () => {`;

  frontendContent = frontendContent.replace('  const getHeaders = () => {', fetchWithAuthDef);
  
  // Replace fetch( with fetchWithAuth( inside the component, but only for our API calls
  // We'll just replace 'await fetch(' with 'await fetchWithAuth('
  frontendContent = frontendContent.replace(/await fetch\(/g, 'await fetchWithAuth(');

  fs.writeFileSync(frontendPath, frontendContent, 'utf8');
  console.log('Frontend updated successfully.');
} else {
  console.log('Frontend already updated.');
}
