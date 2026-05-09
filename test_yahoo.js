import yahooFinance from 'yahoo-finance2';
async function test() {
  const yahoo = new yahooFinance();
  try {
    const q = await yahoo.quote('MULN');
    console.log("quote object:", q);
  } catch (e) {
    console.error("quote error:", e.message);
  }
}
test();
