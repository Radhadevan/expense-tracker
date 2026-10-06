const SmsTransactionParser = require('./sms-parser.js');

const userFunds = [
  { id: 'fund-rd', name: 'RD', targetAmount: 12000, currentAmount: 1000 },
  { id: 'fund-weekly', name: 'Weekly Saving Fund', targetAmount: 1600, currentAmount: 1200 }
];

const tests = [
  {
    id: 1,
    sms: "Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI.",
    desc: "EXPENSE ₹500, Petrol / Travel, UPI, ABC PETROL PUMP",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'EXPENSE' &&
      res.amount === 500 &&
      res.merchant === 'ABC Petrol Pump' &&
      res.categoryName === 'Petrol / Travel' &&
      res.paymentMethod === 'UPI' &&
      res.accountSuffix === 'XX1234'
    )
  },
  {
    id: 2,
    sms: "Rs.250 debited at ABC RESTAURANT.",
    desc: "EXPENSE ₹250, Food",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'EXPENSE' &&
      res.amount === 250 &&
      res.merchant === 'ABC Restaurant' &&
      res.categoryName === 'Food'
    )
  },
  {
    id: 3,
    sms: "Salary of Rs.25,000 credited to A/c XX1234.",
    desc: "INCOME ₹25,000, Salary",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'INCOME' &&
      res.amount === 25000 &&
      res.categoryName === 'Salary' &&
      res.accountSuffix === 'XX1234'
    )
  },
  {
    id: 4,
    sms: "Rs.450 refund credited.",
    desc: "REFUND ₹450",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'REFUND' &&
      res.amount === 450
    )
  },
  {
    id: 5,
    sms: "Your OTP is 829301.",
    desc: "IGNORE (OTP message)",
    validate: (res) => (
      res.isFinancial === false && res.isIgnored === true
    )
  },
  {
    id: 6,
    sms: "Use coupon SAVE500.",
    desc: "IGNORE (Coupon message)",
    validate: (res) => (
      res.isFinancial === false && res.isIgnored === true
    )
  },
  {
    id: 7,
    sms: "Your order will be delivered today.",
    desc: "IGNORE (Delivery update)",
    validate: (res) => (
      res.isFinancial === false && res.isIgnored === true
    )
  },
  {
    id: 8,
    sms: "Rs.1,000 transferred to RD.",
    desc: "FUND CONTRIBUTION ₹1,000, RD",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'FUND_CONTRIBUTION' &&
      res.amount === 1000 &&
      (res.fundTargetName === 'RD' || res.merchant.includes('RD'))
    )
  },
  {
    id: 9,
    sms: "UPI transfer of Rs.5,000 to own account.",
    desc: "TRANSFER ₹5,000",
    validate: (res) => (
      res.isFinancial === true &&
      res.type === 'TRANSFER' &&
      res.amount === 5000
    )
  },
  {
    id: 10,
    sms: "Same transaction SMS received twice.",
    desc: "ONE transaction only (duplicate rejected)",
    customRun: () => {
      const smsText = "Your A/c XX1234 is debited by Rs.500 at ABC PETROL PUMP via UPI. Ref 987654321";
      const res1 = SmsTransactionParser.parseSms(smsText, { userFunds });
      const fakeExistingTxns = [{
        amount: 500,
        type: 'EXPENSE',
        transactionReference: '987654321',
        fingerprint: res1.fingerprint
      }];
      const res2 = SmsTransactionParser.parseSms(smsText, {
        userFunds,
        existingTransactions: fakeExistingTxns
      });
      return res2.isDuplicate === true;
    }
  }
];

console.log('====================================================');
console.log('🧪 TESTING SMS PARSER AGAINST ALL 10 PROMPT FIXTURES');
console.log('====================================================');

let passed = 0;
tests.forEach((t) => {
  let isPass = false;
  let res = null;
  try {
    if (t.customRun) {
      isPass = t.customRun();
      res = { duplicateDetected: isPass };
    } else {
      res = SmsTransactionParser.parseSms(t.sms, { userFunds });
      isPass = t.validate(res);
    }
  } catch (err) {
    res = { error: err.message };
    isPass = false;
  }

  if (isPass) {
    passed++;
    console.log(`[PASS] Fixture #${t.id}: ${t.desc}`);
  } else {
    console.error(`[FAIL] Fixture #${t.id}: ${t.desc}`);
    console.error('       Input SMS:', t.sms);
    console.error('       Parsed output:', JSON.stringify(res, null, 2));
  }
});

console.log('====================================================');
console.log(`Summary: ${passed} / ${tests.length} tests passed.`);
if (passed === tests.length) {
  console.log('🎉 ALL 10 TEST FIXTURES PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('❌ SOME FIXTURES FAILED!');
  process.exit(1);
}
