/**
 * 直接测试后端登录功能
 */
async function testLogin() {
  console.log('========================================');
  console.log('测试后端登录功能');
  console.log('========================================\n');

  try {
    const response = await fetch('http://localhost:3001/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
        ip: 'local'
      })
    });

    console.log('HTTP Status:', response.status);
    console.log('Status Text:', response.statusText);

    const text = await response.text();
    console.log('Response Body:', text);

    try {
      const json = JSON.parse(text);
      console.log('\nParsed JSON:', json);
    } catch (e) {
      console.log('\n(Not valid JSON)');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();
