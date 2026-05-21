import { request } from 'http';
const req = request('http://localhost:3000/api/stock/AAPL', { method: 'GET' }, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
});
req.on('error', (e) => console.error(e));
req.end();
