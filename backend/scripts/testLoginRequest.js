const fetch = require('node-fetch');

async function test(){
  const res = await fetch('http://localhost:9000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@dfashion.com', password: 'SuperAdmin123!' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log(text);
}

test().catch(err=>{console.error(err);process.exit(1);});