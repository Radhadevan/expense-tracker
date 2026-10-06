/**
 * EXPENSE TRACKER — MODULAR FINANCIAL SMS TRANSACTION PARSER
 * Extensible, privacy-first parsing engine for Indian banking and UPI SMS messages.
 * 
 * Modular Architecture:
 * - FilterEngine: Rejects OTPs, login verification, marketing coupons, delivery updates & personal messages
 * - AmountExtractor: Decimal-safe extraction of ₹, Rs., Rs, INR amounts with comma handling
 * - TypeClassifier: Classifies EXPENSE, INCOME, REFUND, TRANSFER, FUND_CONTRIBUTION
 * - MerchantExtractor: Extracts & cleans merchant names (e.g. Swiggy, ABC Petrol Pump, Uber)
 * - CategoryPredictor: Suggests categories with user learning integration
 * - ReferenceExtractor: Captures UPI Ref, UTR, RRN & Bank transaction IDs
 * - AccountExtractor: Extracts masked account/card numbers (e.g. XX1234)
 * - DuplicateDetector: Generates deterministic transaction fingerprints
 * - ConfidenceScorer: Computes HIGH / MEDIUM / LOW transaction confidence
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SmsTransactionParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =========================================================================
  // 1. FILTER ENGINE (OTP, PROMO & PERSONAL SPAM REJECTION)
  // =========================================================================
  const FilterEngine = {
    otpPatterns: [
      /\b(?:otp|one\s*time\s*password|verification\s*code|security\s*code|secret\s*code|login\s*code|auth\s*code)\b/i,
      /\b(?:is\s*your\s*otp|your\s*otp\s*is|use\s*code|pin\s*for\s*login)\b/i,
      /\b(?:do\s*not\s*share\s*your\s*otp|never\s*share\s*otp|valid\s*for\s*\d+\s*(?:mins?|minutes?))\b/i
    ],

    promoPatterns: [
      /\b(?:coupon|voucher|promo\s*code|discount\s*of|flat\s*\d+%\s*off|save\s*\d+|use\s*coupon|use\s*code)\b/i,
      /\b(?:hurry|offer\s*valid|cashback\s*upto|exclusive\s*deal|sale\s*is\s*live|apply\s*code)\b/i,
      /\b(?:claim\s*now|win\s*upto|scratch\s*card|pre-approved\s*loan|apply\s*for\s*loan)\b/i
    ],

    deliveryPatterns: [
      /\b(?:order\s*(?:will\s*be|is)\s*delivered|arriving\s*today|out\s*for\s*delivery|package\s*delivered|shipment)\b/i,
      /\b(?:dispatched|tracking\s*link|track\s*your\s*order|delivery\s*executive)\b/i
    ],

    personalPatterns: [
      /\b(?:how\s*are\s*you|call\s*me|where\s*are\s*you|happy\s*birthday|congratulations|good\s*morning|good\s*night)\b/i
    ],

    check(text) {
      if (!text || typeof text !== 'string') {
        return { isIgnored: true, reason: 'Empty message' };
      }

      const clean = text.trim();

      // Check OTP
      for (const p of this.otpPatterns) {
        if (p.test(clean)) {
          return { isIgnored: true, reason: 'OTP / Verification Code' };
        }
      }

      // Check Promotional / Coupon
      for (const p of this.promoPatterns) {
        if (p.test(clean)) {
          return { isIgnored: true, reason: 'Promotional / Coupon Message' };
        }
      }

      // Check Delivery Update
      for (const p of this.deliveryPatterns) {
        if (p.test(clean)) {
          return { isIgnored: true, reason: 'Delivery / Order Status Alert' };
        }
      }

      // Check Personal Chat
      for (const p of this.personalPatterns) {
        if (p.test(clean)) {
          return { isIgnored: true, reason: 'Personal / Non-Financial Message' };
        }
      }

      return { isIgnored: false, reason: null };
    }
  };

  // =========================================================================
  // 2. AMOUNT EXTRACTOR (DECIMAL-SAFE INDIAN CURRENCIES)
  // =========================================================================
  const AmountExtractor = {
    // Matches: ₹500, Rs.500, Rs 500, INR 500, INR500, ₹1,250.00, Rs. 1,250.50, Rs: 500, INR: 500
    patterns: [
      /(?:(?:rs|inr|\u20B9)\.?\s*:?\s*)([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
      /([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)\s*(?:inr|rs\.?|\u20B9)/i,
      /(?:debited|credited|spent|withdrawn|paid|received|refunded|transferred)\s*(?:by|of|with|for)?\s*(?:(?:rs|inr|\u20B9)\.?\s*:?\s*)?([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i
    ],

    extract(text) {
      if (!text) return null;

      // Look for explicit currency prefix first
      for (const regex of this.patterns) {
        const match = text.match(regex);
        if (match && match[1]) {
          const rawNum = match[1].replace(/,/g, '');
          const val = parseFloat(rawNum);
          if (!isNaN(val) && val > 0 && val < 100000000) {
            // Decimal-safe 2-digit rounding
            return Math.round(val * 100) / 100;
          }
        }
      }

      return null;
    }
  };

  // =========================================================================
  // 3. TRANSACTION TYPE CLASSIFIER
  // =========================================================================
  const TypeClassifier = {
    rdKeywords: [
      /\b(?:transferred\s*to\s*rd|rd\s*deposit|recurring\s*deposit|to\s*rd\b|towards\s*rd)\b/i,
      /\b(?:weekly\s*saving|weekly\s*fund|emergency\s*fund)\b/i
    ],

    transferKeywords: [
      /\b(?:transfer(?:red)?\s*(?:of\s*(?:rs\.?|inr|\u20B9)?\s*[\d,.]+\s*)?(?:to|from)?\s*(?:own|another|self)\s*account)\b/i,
      /\b(?:transfer(?:red)?\s*(?:to|from)?\s*(?:own|another|self)\s*account|self\s*transfer|between\s*(?:your|own)\s*accounts)\b/i,
      /\b(?:transferred\s*(?:rs\.?|inr|\u20B9)?\s*[\d,.]+\s*to\s*another\s*account)\b/i,
      /\b(?:to\s*own\s*account|from\s*own\s*account|between\s*own\s*accounts)\b/i
    ],

    refundKeywords: [
      /\b(?:refund|refunded|refund\s*credited|reversal|reversed|chargeback)\b/i
    ],

    incomeKeywords: [
      /\b(?:salary\s*credited|salary\s*of|payroll|sal\s*credit|credited\s*(?:to|with|in)|received|deposit(?:ed)?)\b/i,
      /\b(?:cashback\s*credited|interest\s*credited)\b/i
    ],

    expenseKeywords: [
      /\b(?:debited|withdrawn|spent|purchase|paid|payment|dr\b|sent\s*to|transferred\s*to)\b/i
    ],

    classify(text, userFunds) {
      if (!text) return 'UNKNOWN';
      const clean = text.toLowerCase();

      // Check Fund Contribution (RD, Weekly Saving Fund, Emergency Fund)
      for (const pattern of this.rdKeywords) {
        if (pattern.test(clean)) {
          return 'FUND_CONTRIBUTION';
        }
      }

      // Check dynamic user fund names (e.g. if user has a fund named "RD" or "Weekly Saving Fund")
      if (Array.isArray(userFunds) && userFunds.length > 0) {
        for (const f of userFunds) {
          if (f.name && f.name.length > 1) {
            const fundReg = new RegExp(`\\b(?:to|in|towards)\\s+${f.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (fundReg.test(clean)) {
              return 'FUND_CONTRIBUTION';
            }
          }
        }
      }

      // Check Refund
      for (const pattern of this.refundKeywords) {
        if (pattern.test(clean)) {
          return 'REFUND';
        }
      }

      // Check Account-to-Account Transfer
      for (const pattern of this.transferKeywords) {
        if (pattern.test(clean)) {
          return 'TRANSFER';
        }
      }

      // Check Salary / Income
      for (const pattern of this.incomeKeywords) {
        if (pattern.test(clean)) {
          return 'INCOME';
        }
      }

      // Check Expense
      for (const pattern of this.expenseKeywords) {
        if (pattern.test(clean)) {
          return 'EXPENSE';
        }
      }

      // Fallback check on credit/debit indicators
      if (/\b(?:cr\.?|credited)\b/i.test(clean)) return 'INCOME';
      if (/\b(?:dr\.?|debited)\b/i.test(clean)) return 'EXPENSE';

      return 'UNKNOWN';
    }
  };

  // =========================================================================
  // 4. MERCHANT EXTRACTOR
  // =========================================================================
  const MerchantExtractor = {
    // Known merchant dictionaries & cleanup
    knownMerchants: [
      { name: 'ABC Petrol Pump', regex: /\babc\s*petrol\s*pump\b/i },
      { name: 'Petrol Pump', regex: /\b(?:petrol\s*pump|fuel\s*station|shell|hpcl|bpcl|iocl)\b/i },
      { name: 'ABC Restaurant', regex: /\babc\s*restaurant\b/i },
      { name: 'Swiggy', regex: /\bswiggy\b/i },
      { name: 'Zomato', regex: /\bzomato\b/i },
      { name: 'Uber', regex: /\buber(?:\s*india)?\b/i },
      { name: 'Ola', regex: /\bola(?:\s*cabs)?\b/i },
      { name: 'Amazon', regex: /\bamazon(?:\s*pay|\s*seller|\s*in)?\b/i },
      { name: 'Flipkart', regex: /\bflipkart\b/i },
      { name: 'Myntra', regex: /\bmyntra\b/i },
      { name: 'Netflix', regex: /\bnetflix\b/i },
      { name: 'Spotify', regex: /\bspotify\b/i },
      { name: 'Cult.fit', regex: /\b(?:cult\.?fit|cult)\b/i },
      { name: 'Starbucks', regex: /\bstarbucks\b/i },
      { name: 'McDonalds', regex: /\bmcdonald'?s?\b/i },
      { name: 'Dominos', regex: /\bdomino'?s?\b/i },
      { name: 'KFC', regex: /\bkfc\b/i },
      { name: 'Zepto', regex: /\bzepto\b/i },
      { name: 'Blinkit', regex: /\bblinkit\b/i },
      { name: 'Instamart', regex: /\binstamart\b/i },
      { name: 'BigBasket', regex: /\bbigbasket\b/i },
      { name: 'DMart', regex: /\bd-?mart\b/i },
      { name: 'ATM', regex: /\b(?:atm\b|cash\s*wdl|cash\s*withdrawal)\b/i }
    ],

    cleanMerchantName(raw) {
      if (!raw) return 'Unknown';
      let name = raw.trim()
        .replace(/[.,;:]+$/, '')
        .replace(/^(?:at|to|via|for|in)\s+/i, '')
        .replace(/\s+(?:pvt\.?\s*ltd\.?|limited|ltd\.?|inc\.?|corp\.?|llp)\b/gi, '')
        .replace(/\s+(?:via\s+upi|on\s+card|through\s+upi|using\s+upi)\b/gi, '')
        .replace(/\s+(?:ref|ref\s*no|utr|rrn|txn|bal|avl|avail|a\/c|card).*$/gi, '')
        .trim();

      // Title Case normalization
      if (name.length > 1) {
        name = name.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      }

      return name.length >= 2 ? name : 'Unknown';
    },

    extract(text) {
      if (!text) return 'Unknown';

      // 1. Check known merchants first
      for (const m of this.knownMerchants) {
        if (m.regex.test(text)) {
          return m.name;
        }
      }

      // 2. Pattern: "at <Merchant> (via|on|ref|using|avail|$)"
      const atMatch = text.match(/\bat\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:via|on|ref|using|avail|bal|avl|from|to|a\/c|card|\.|$))/i);
      if (atMatch && atMatch[1]) {
        const cleaned = this.cleanMerchantName(atMatch[1]);
        if (cleaned && cleaned !== 'Unknown' && cleaned.length < 35) {
          return cleaned;
        }
      }

      // 3. Pattern: "paid to / transfer to / sent to <Merchant>"
      const toMatch = text.match(/\b(?:paid\s*to|sent\s*to|transferred\s*to)\s+([A-Za-z0-9\s&'-]+?)(?=\s+(?:via|on|ref|using|avail|bal|avl|from|a\/c|card|\.|$))/i);
      if (toMatch && toMatch[1]) {
        const cleaned = this.cleanMerchantName(toMatch[1]);
        if (cleaned && cleaned !== 'Unknown' && cleaned.length < 35 && !cleaned.toLowerCase().includes('account')) {
          return cleaned;
        }
      }

      // 4. Pattern: UPI VPA "to <vpa@bank>"
      const vpaMatch = text.match(/\b([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)\b/);
      if (vpaMatch && vpaMatch[1]) {
        return vpaMatch[1];
      }

      // 5. Special cases: Salary, ATM
      if (/\b(?:salary|payroll|sal\s*credit)\b/i.test(text)) return 'Salary';
      if (/\b(?:atm|cash\s*wdl)\b/i.test(text)) return 'ATM';
      if (/\b(?:rd|recurring\s*deposit)\b/i.test(text)) return 'RD Fund';

      return 'Unknown';
    }
  };

  // =========================================================================
  // 5. CATEGORY PREDICTOR (WITH USER LEARNING SYSTEM)
  // =========================================================================
  const CategoryPredictor = {
    // Core keyword rules
    categoryRules: [
      {
        categoryId: 'cat-travel',
        categoryName: 'Petrol / Travel',
        icon: '🚗',
        keywords: [/\b(?:petrol|diesel|fuel|shell|hpcl|bpcl|iocl|uber|ola|metro|irctc|fastag|toll|flight|indigo)\b/i]
      },
      {
        categoryId: 'cat-food',
        categoryName: 'Food',
        icon: '🍔',
        keywords: [/\b(?:restaurant|cafe|swiggy|zomato|mcdonald|starbucks|domino|kfc|pizza|burger|dine|dining|food|baker)\b/i]
      },
      {
        categoryId: 'cat-shopping',
        categoryName: 'Shopping',
        icon: '🛍️',
        keywords: [/\b(?:amazon|flipkart|myntra|ajio|zara|h&m|retail|mart|supermarket|dmart|bigbasket|zepto|blinkit|instamart)\b/i]
      },
      {
        categoryId: 'cat-salary',
        categoryName: 'Salary',
        icon: '💼',
        keywords: [/\b(?:salary|payroll|sal\s*credit|monthly\s*wages|employer)\b/i]
      },
      {
        categoryId: 'cat-rent',
        categoryName: 'Rent',
        icon: '🏠',
        keywords: [/\b(?:rent|landlord|house\s*rent|flat\s*rent|apartment)\b/i]
      },
      {
        categoryId: 'cat-emi',
        categoryName: 'EMI',
        icon: '💳',
        keywords: [/\b(?:emi|loan|bajaj\s*finserv|hdfc\s*credila|home\s*loan|car\s*loan)\b/i]
      },
      {
        categoryId: 'cat-bills',
        categoryName: 'Bills',
        icon: '💡',
        keywords: [/\b(?:electricity|bescom|broadband|wifi|water|gas|cylinder|billdesk|recharge|airtel|jio|vi\b|tneb)\b/i]
      },
      {
        categoryId: 'cat-gym',
        categoryName: 'Gym',
        icon: '🏋️',
        keywords: [/\b(?:gym|fitness|cult\.?fit|workout|cult)\b/i]
      },
      {
        categoryId: 'cat-subscriptions',
        categoryName: 'Subscriptions',
        icon: '📱',
        keywords: [/\b(?:netflix|spotify|prime|youtube|hotstar|apple|google\s*play|disney)\b/i]
      },
      {
        categoryId: 'cat-health',
        categoryName: 'Health',
        icon: '💊',
        keywords: [/\b(?:pharmacy|apollo|medplus|hospital|clinic|doctor|diagnostics|netmeds|pharmeasy)\b/i]
      }
    ],

    predict(merchant, text, type, learnedMappings) {
      const cleanMerchant = (merchant || '').toLowerCase().trim();
      const cleanText = (text || '').toLowerCase();

      // 1. Check User Learned Mappings first!
      if (learnedMappings && cleanMerchant && learnedMappings[cleanMerchant]) {
        return learnedMappings[cleanMerchant];
      }

      // Check partial match in learned mappings
      if (learnedMappings && cleanMerchant) {
        for (const [key, mapData] of Object.entries(learnedMappings)) {
          if (cleanMerchant.includes(key.toLowerCase()) || key.toLowerCase().includes(cleanMerchant)) {
            return mapData;
          }
        }
      }

      // 2. Specific types
      if (type === 'INCOME' && /\b(?:salary|payroll|sal\s*credit)\b/i.test(cleanText)) {
        return { categoryId: 'cat-salary', categoryName: 'Salary', icon: '💼' };
      }

      if (type === 'FUND_CONTRIBUTION') {
        return { categoryId: 'cat-other-exp', categoryName: 'Fund Contribution', icon: '🏦' };
      }

      if (type === 'TRANSFER') {
        return { categoryId: 'cat-other-exp', categoryName: 'Transfer', icon: '🔄' };
      }

      if (type === 'REFUND') {
        return { categoryId: 'cat-other-inc', categoryName: 'Refund', icon: '↩️' };
      }

      // 3. Rule matching
      for (const rule of this.categoryRules) {
        for (const kw of rule.keywords) {
          if (kw.test(cleanMerchant) || kw.test(cleanText)) {
            return {
              categoryId: rule.categoryId,
              categoryName: rule.categoryName,
              icon: rule.icon
            };
          }
        }
      }

      // Fallback
      if (type === 'INCOME') {
        return { categoryId: 'cat-other-inc', categoryName: 'Other Income', icon: '💰' };
      }

      return { categoryId: 'cat-other-exp', categoryName: 'Other', icon: '📦' };
    }
  };

  // =========================================================================
  // 6. PAYMENT METHOD & ACCOUNT EXTRACTOR
  // =========================================================================
  const PaymentMethodExtractor = {
    extract(text) {
      if (!text) return 'UPI';
      const clean = text.toLowerCase();

      if (/\b(?:upi|vpa|gpay|phonepe|paytm\s*upi|bhim)\b/i.test(clean)) return 'UPI';
      if (/\b(?:credit\s*card|cc\b)\b/i.test(clean)) return 'Credit Card';
      if (/\b(?:debit\s*card|dc\b)\b/i.test(clean)) return 'Debit Card';
      if (/\b(?:atm|cash\s*wdl)\b/i.test(clean)) return 'Cash';
      if (/\b(?:netbanking|neft|rtgs|imps|bank\s*transfer)\b/i.test(clean)) return 'Bank';
      if (/\b(?:wallet|paytm\s*wallet)\b/i.test(clean)) return 'Wallet';

      return 'UPI';
    }
  };

  const AccountExtractor = {
    extract(text) {
      if (!text) return null;
      // Matches A/c XX1234, A/C ...1234, Account *1234, ending in 1234, Card ending 1234
      const m = text.match(/\b(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*[:\-]?\s*(?:(?:xx+|\*+|\.{2,})?([0-9]{3,4}))/i);
      if (m && m[1]) return `XX${m[1]}`;

      const endingMatch = text.match(/\b(?:ending|ending\s*in|ending\s*with)\s*([0-9]{3,4})\b/i);
      if (endingMatch && endingMatch[1]) return `XX${endingMatch[1]}`;

      const directSuffix = text.match(/\b(?:xx|XX|\*\*)\s*([0-9]{3,4})\b/);
      if (directSuffix && directSuffix[1]) return `XX${directSuffix[1]}`;

      return null;
    }
  };

  // =========================================================================
  // 7. TRANSACTION REFERENCE EXTRACTOR (UTR / RRN / UPI REF)
  // =========================================================================
  const ReferenceExtractor = {
    extract(text) {
      if (!text) return null;
      // Matches: UPI Ref 453829102, Ref No 123456, UTR: 123456, RRN 123456, Txn ID 123456
      const refPatterns = [
        /\b(?:upi\s*ref(?:\s*no|\s*num)?|ref(?:\s*no|\s*num)?|rrn|utr|txn(?:\s*id)?)\s*[:\-]?\s*([A-Za-z0-9]{6,22})\b/i,
        /\b(?:reference\s*(?:no|number)?)\s*[:\-]?\s*([A-Za-z0-9]{6,22})\b/i
      ];

      for (const p of refPatterns) {
        const m = text.match(p);
        if (m && m[1]) return m[1].trim();
      }

      return null;
    }
  };

  // =========================================================================
  // 8. DUPLICATE DETECTOR & FINGERPRINTING
  // =========================================================================
  const DuplicateDetector = {
    // Generate deterministic hash string
    createFingerprint(data) {
      const parts = [
        data.userId || 'anon',
        data.amount ? data.amount.toFixed(2) : '0.00',
        data.transactionDate || '',
        data.transactionReference || '',
        data.merchant || '',
        data.accountSuffix || ''
      ];
      return parts.join('|').toLowerCase().replace(/\s+/g, '_');
    },

    isDuplicate(candidate, existingTxns, pendingCandidates) {
      const targetFingerprint = candidate.fingerprint;

      // 1. Check exact reference number match if present
      if (candidate.transactionReference) {
        const ref = candidate.transactionReference.toLowerCase();
        const dupInTxns = (existingTxns || []).some(
          (t) => t.transactionReference && t.transactionReference.toLowerCase() === ref
        );
        if (dupInTxns) return true;

        const dupInCandidates = (pendingCandidates || []).some(
          (c) => c.transactionReference && c.transactionReference.toLowerCase() === ref && c.id !== candidate.id
        );
        if (dupInCandidates) return true;
      }

      // 2. Check fingerprint match
      if (targetFingerprint) {
        const dupTxn = (existingTxns || []).some(
          (t) => t.fingerprint === targetFingerprint
        );
        if (dupTxn) return true;

        const dupCand = (pendingCandidates || []).some(
          (c) => c.fingerprint === targetFingerprint && c.id !== candidate.id
        );
        if (dupCand) return true;
      }

      // 3. Heuristic match: same amount + same date + same merchant + same type within same window
      const heurDup = (existingTxns || []).some((t) => {
        return (
          t.amount === candidate.amount &&
          t.type === candidate.type &&
          t.date === candidate.transactionDate &&
          t.description &&
          candidate.merchant &&
          t.description.toLowerCase().includes(candidate.merchant.toLowerCase())
        );
      });

      return heurDup;
    }
  };

  // =========================================================================
  // 9. CONFIDENCE SCORER
  // =========================================================================
  const ConfidenceScorer = {
    score(parsed) {
      if (!parsed.amount || parsed.type === 'UNKNOWN') {
        return 'LOW';
      }

      let points = 0;
      if (parsed.amount > 0) points += 2;
      if (parsed.type && parsed.type !== 'UNKNOWN') points += 2;
      if (parsed.merchant && parsed.merchant !== 'Unknown') points += 2;
      if (parsed.accountSuffix) points += 1;
      if (parsed.transactionReference) points += 2;
      if (parsed.paymentMethod && parsed.paymentMethod !== 'Other') points += 1;

      if (points >= 6) return 'HIGH';
      if (points >= 4) return 'MEDIUM';
      return 'LOW';
    }
  };

  // =========================================================================
  // 10. MASTER SMS TRANSACTION PARSER
  // =========================================================================
  function parseSms(messageText, options = {}) {
    const rawText = (messageText || '').trim();
    const userFunds = options.userFunds || [];
    const learnedMappings = options.learnedMappings || {};
    const userId = options.userId || 'user-default-1';
    const timestamp = options.timestamp ? new Date(options.timestamp) : new Date();

    // Step 1: Filter Engine check (OTP, Spam, Delivery, Personal)
    const filterResult = FilterEngine.check(rawText);
    if (filterResult.isIgnored) {
      return {
        isFinancial: false,
        isIgnored: true,
        ignoreReason: filterResult.reason,
        rawText,
        confidence: 'LOW'
      };
    }

    // Step 2: Amount Extraction
    const amount = AmountExtractor.extract(rawText);
    if (!amount) {
      return {
        isFinancial: false,
        isIgnored: true,
        ignoreReason: 'No currency amount found',
        rawText,
        confidence: 'LOW'
      };
    }

    // Step 3: Type Classification
    const type = TypeClassifier.classify(rawText, userFunds);
    if (type === 'UNKNOWN') {
      return {
        isFinancial: false,
        isIgnored: true,
        ignoreReason: 'Unrecognized transaction action',
        rawText,
        confidence: 'LOW'
      };
    }

    // Step 4: Merchant Extraction
    const merchant = MerchantExtractor.extract(rawText);

    // Step 5: Category Prediction (with Learning System)
    const categorySuggestion = CategoryPredictor.predict(merchant, rawText, type, learnedMappings);

    // Step 6: Payment Method & Account Suffix
    const paymentMethod = PaymentMethodExtractor.extract(rawText);
    const accountSuffix = AccountExtractor.extract(rawText);

    // Step 7: Transaction Reference
    const transactionReference = ReferenceExtractor.extract(rawText);

    // Date & Time formatting (YYYY-MM-DD, HH:MM)
    const pad = (n) => String(n).padStart(2, '0');
    const transactionDate = `${timestamp.getFullYear()}-${pad(timestamp.getMonth() + 1)}-${pad(timestamp.getDate())}`;
    const transactionTime = `${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}`;

    // Target Fund ID if matched to fund
    let fundTargetId = null;
    let fundTargetName = null;
    if (type === 'FUND_CONTRIBUTION') {
      const lower = rawText.toLowerCase();
      for (const f of userFunds) {
        if (f.name && lower.includes(f.name.toLowerCase())) {
          fundTargetId = f.id;
          fundTargetName = f.name;
          break;
        }
      }
      if (!fundTargetId && userFunds.length > 0) {
        // Match RD or first fund
        const rdFund = userFunds.find((f) => /rd|recurring/i.test(f.name));
        if (rdFund) {
          fundTargetId = rdFund.id;
          fundTargetName = rdFund.name;
        }
      }
    }

    // Pre-calculate confidence
    const candidateData = {
      userId,
      amount,
      type,
      merchant,
      categorySuggestion,
      paymentMethod,
      accountSuffix,
      transactionReference,
      transactionDate,
      transactionTime
    };

    const confidence = ConfidenceScorer.score(candidateData);
    const fingerprint = DuplicateDetector.createFingerprint(candidateData);

    // Check duplicate if collections provided
    const isDup = DuplicateDetector.isDuplicate(
      { ...candidateData, fingerprint },
      options.existingTransactions,
      options.pendingCandidates
    );

    return {
      isFinancial: true,
      isIgnored: false,
      isDuplicate: isDup,
      fingerprint,
      type,
      amount,
      merchant,
      categoryId: categorySuggestion.categoryId,
      categoryName: categorySuggestion.categoryName,
      categoryIcon: categorySuggestion.icon,
      paymentMethod,
      transactionReference,
      accountSuffix,
      transactionDate,
      transactionTime,
      confidence,
      source: 'SMS',
      fundTargetId,
      fundTargetName,
      rawText: options.keepRawText ? rawText : undefined
    };
  }

  return {
    FilterEngine,
    AmountExtractor,
    TypeClassifier,
    MerchantExtractor,
    CategoryPredictor,
    PaymentMethodExtractor,
    AccountExtractor,
    ReferenceExtractor,
    DuplicateDetector,
    ConfidenceScorer,
    parseSms
  };
});
