import yahooFinance from 'yahoo-finance2';
async function run() {
  console.log('type of yahooFinance:', typeof yahooFinance);
  console.log('keys of yahooFinance:', Object.keys(yahooFinance));
  try {
     const quote = await yahooFinance.quote('AAPL');
     console.log('quote AAPL:', Object.keys(quote));
  } catch (e) {
     console.error('error quote:', e);
  }
}
run();
