const fs = require('fs');
const path = require('path');

async function runTest() {
  const fileContent = "dummy image data";
  const blob = new Blob([fileContent], { type: 'image/png' });
  const file = new File([blob], "test-image.png", { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', 'test_user_id');

  try {
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

runTest();
