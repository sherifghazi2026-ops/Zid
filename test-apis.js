// ملف اختبار جميع APIs
const https = require('https');

const apis = [
  {
    name: 'Azure OpenAI',
    url: 'https://sherifghazi-7065-resource.openai.azure.com/openai/deployments/Zayed/chat/completions?api-version=2024-08-01-preview',
    headers: {
      'api-key': 'DwFjOWx31jB369PeEpIQGXc2g7qXGD9GJRGUd2D2VhwQgSuHzjFAJQQJ99CBACHYHv6XJ3w3AAAAACOGTZ35',
      'Content-Type': 'application/json'
    },
    body: {
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10
    }
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: {
      'Authorization': 'Bearer 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',
      'Content-Type': 'application/json'
    },
    body: {
      model: 'qwen/qwen-2.5-7b-instruct:free',
      messages: [{ role: 'user', content: 'Hello' }]
    }
  }
];

async function testAPI(api) {
  console.log(`\n🔍 Testing ${api.name}...`);
  try {
    const response = await fetch(api.url, {
      method: 'POST',
      headers: api.headers,
      body: JSON.stringify(api.body)
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${api.name} is WORKING!`);
      return true;
    } else {
      const error = await response.text();
      console.log(`❌ ${api.name} FAILED: ${error.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${api.name} ERROR: ${error.message}`);
    return false;
  }
}

async function testAll() {
  console.log('🚀 Testing all APIs...');
  let working = 0;
  
  for (const api of apis) {
    if (await testAPI(api)) working++;
  }
  
  console.log(`\n📊 Results: ${working}/${apis.length} APIs working`);
}

testAll();
