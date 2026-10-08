/**
 * Learn With ED Science - License Activation Client
 * 
 * This script can be embedded in your web application to activate licenses.
 * Example usage:
 * 
 *   <script src="activate.js"></script>
 *   <script>
 *     activateLicense('EDSCI-XXXXXXXX', 'device-id-12345');
 *   </script>
 */

async function activateLicense(code, deviceId, serverUrl = 'http://localhost:3000') {
  try {
    const response = await fetch(`${serverUrl}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, device_id: deviceId })
    });

    const result = await response.json();

    if (result.ok) {
      console.log('✓ License activated:', code);
      return { success: true, message: result.message };
    } else {
      console.error('✗ Activation failed:', result.message);
      return { success: false, message: result.message };
    }
  } catch (e) {
    console.error('✗ Connection error:', e.message);
    return { success: false, message: 'Connection error. Check server URL.' };
  }
}

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('activate_code');
  const deviceId = params.get('device_id');

  if (code && deviceId) {
    activateLicense(code, deviceId);
  }
}
