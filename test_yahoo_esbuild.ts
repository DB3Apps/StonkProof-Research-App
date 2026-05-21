import YahooFinance from 'yahoo-finance2';

let yahoo;
try {
  yahoo = new YahooFinance();
} catch (e) {
  if (YahooFinance && YahooFinance.default && typeof YahooFinance.default === 'function') {
    yahoo = new YahooFinance.default();
  } else {
    yahoo = YahooFinance;
  }
}

async function run() {
  try {
     const quote = await yahoo.quote('AAPL');
     console.log('quote AAPL:', Object.keys(quote));
  } catch (e) {
     console.error('error quote:', e.message);
  }
}
run();
