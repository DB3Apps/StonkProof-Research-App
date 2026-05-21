import { request } from 'http';
const req = request('http://localhost:3000/', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body start:', data.substring(0, 200));
  });
});
req.on('error', (e) => console.error(e));
req.end();
