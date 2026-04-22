import * as yf from 'yahoo-finance2';
console.log('Keys of yahoo-finance2:', Object.keys(yf));
console.log('Default export:', yf.default ? Object.keys(yf.default) : 'No default');
