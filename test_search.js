import yahooFinance from 'yahoo-finance2';
async function test() {
  const yahoo = new yahooFinance();
  try {
    const s = await yahoo.search('Mullen');
    console.log("search:", s.quotes.map(q => q.symbol));
  } catch (e) { }
}
test();
