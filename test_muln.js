import http from 'http';
http.get('http://localhost:3000/api/stock/MULN', (res) => {
  console.log("Status:", res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("Body:", data));
});
