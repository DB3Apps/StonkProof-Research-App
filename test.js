import yahooFinance from 'yahoo-finance2';
const yahoo = new yahooFinance();
yahoo.quote('AAPL').then(res => console.log('OK')).catch(console.error);
