import fetch from 'node-fetch';

async function testApi() {
  try {
    console.log('测试后端 API: GET /api/wbs-tasks\n');
    
    const response = await fetch('http://localhost:3001/api/wbs-tasks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    console.log('API 响应状态:', response.status);
    console.log('API 响应数据:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ API 测试失败:', error);
  }
}

testApi();
