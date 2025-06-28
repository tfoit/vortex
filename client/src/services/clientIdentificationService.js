class ClientIdentificationService {
  constructor() {
    // Mock client database - in real app this would come from banking system
    this.mockClients = [
      {
        id: "client_001",
        name: "John Smith",
        firstName: "John",
        lastName: "Smith",
        clientIdentificationNumber: "CIN-JS-2024-001",
        email: "john.smith@email.com",
        phone: "+41 44 234 5678",
        birthdate: "1978-09-22",
        nationality: "Swiss",
        preferredLanguage: "German",
        address: {
          street: "Limmatquai 45",
          city: "Zurich",
          postalCode: "8001",
          country: "Switzerland",
        },
        accounts: [
          { type: "checking", accountNumber: "CH 2050 2222 3456 88 23", iban: "CH20 5022 2234 5688 2300 0", balance: 45200.75, currency: "CHF", openedDate: "2020-03-15" },
          { type: "savings", accountNumber: "CH 2050 2222 3456 88 24", iban: "CH20 5022 2234 5688 2400 0", balance: 125000.0, currency: "CHF", openedDate: "2020-03-15" },
          { type: "investment", accountNumber: "CH 2050 2222 3456 88 25", iban: "CH20 5022 2234 5688 2500 0", balance: 380000.0, currency: "CHF", openedDate: "2021-06-10" },
        ],
        riskProfile: "moderate",
        lastContact: "2024-01-15",
        status: "active",
      },
      {
        id: "client_002",
        name: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        clientIdentificationNumber: "CIN-SJ-2024-002",
        email: "sarah.johnson@email.com",
        phone: "+41 22 345 6789",
        birthdate: "1990-12-08",
        nationality: "American",
        preferredLanguage: "English",
        address: {
          street: "Seestrasse 78",
          city: "Geneva",
          postalCode: "1204",
          country: "Switzerland",
        },
        accounts: [
          { type: "checking", accountNumber: "CH 3050 3333 4567 99 34", iban: "CH30 5033 3345 6799 3400 0", balance: 18500.25, currency: "CHF", openedDate: "2022-01-20" },
          { type: "savings", accountNumber: "CH 3050 3333 4567 99 35", iban: "CH30 5033 3345 6799 3500 0", balance: 95000.0, currency: "CHF", openedDate: "2022-01-20" },
          { type: "pension", accountNumber: "CH 3050 3333 4567 99 36", iban: "CH30 5033 3345 6799 3600 0", balance: 45000.0, currency: "CHF", openedDate: "2023-05-12" },
        ],
        riskProfile: "conservative",
        lastContact: "2024-01-10",
        status: "active",
      },
      {
        id: "client_003",
        name: "Jane Smith",
        firstName: "Jane",
        lastName: "Smith",
        clientIdentificationNumber: "CIN-JS-2025-001",
        email: "jane.smith@email.com",
        phone: "+41 44 123 4567",
        birthdate: "1985-03-15",
        nationality: "Swiss",
        preferredLanguage: "English",
        address: {
          street: "Bahnhofstrasse 123",
          city: "Zurich",
          postalCode: "8001",
          country: "Switzerland",
        },
        accounts: [
          { type: "checking", accountNumber: "CH 1050 1111 2345 77 12", iban: "CH10 5011 1123 4577 1200 0", balance: 25750.5, currency: "CHF", openedDate: "2023-06-15" },
          { type: "savings", accountNumber: "CH 1050 1111 2345 77 13", iban: "CH10 5011 1123 4577 1300 0", balance: 85000.0, currency: "CHF", openedDate: "2023-06-15" },
          { type: "investment", accountNumber: "CH 1050 1111 2345 77 14", iban: "CH10 5011 1123 4577 1400 0", balance: 150000.0, currency: "CHF", openedDate: "2024-02-20" },
        ],
        riskProfile: "not_assessed",
        lastContact: "2025-01-01",
        status: "active",
      },
      {
        id: "client_004",
        name: "Michael Thompson",
        firstName: "Michael",
        lastName: "Thompson",
        clientIdentificationNumber: "MT-2024-0156",
        email: "michael.thompson@email.com",
        phone: "+41 44 567 8901",
        birthdate: "1972-04-18",
        nationality: "Swiss",
        preferredLanguage: "English",
        address: {
          street: "Paradeplatz 8",
          city: "Zurich",
          postalCode: "8001",
          country: "Switzerland",
        },
        accounts: [
          { type: "checking", accountNumber: "CH 9050 4444 5678 99 34", iban: "CH90 5044 4456 7899 3400 0", balance: 78500.25, currency: "CHF", openedDate: "2020-03-15" },
          { type: "savings", accountNumber: "CH 8050 4444 5678 99 35", iban: "CH80 5044 4456 7899 3500 0", balance: 125000.0, currency: "CHF", openedDate: "2020-03-15" },
          { type: "investment", accountNumber: "CH 7050 4444 5678 99 36", iban: "CH70 5044 4456 7899 3600 0", balance: 450000.75, currency: "CHF", openedDate: "2021-06-10" },
        ],
        riskProfile: "moderate",
        lastContact: "2025-06-25",
        status: "active",
      },
    ];
  }

  /**
   * Identify client from document analysis using multiple criteria
   * @param {Object} analysis - Document analysis result
   * @returns {Object|null} - Identified client or null
   */
  identifyClient(analysis) {
    if (!analysis) return null;

    const extractedText = (analysis.extractedText || analysis.summary || "").toLowerCase();
    console.log("🔍 Client Identification: Starting analysis");
    console.log("📄 Extracted text preview:", extractedText.substring(0, 200) + "...");

    // Log structured client identification data if available
    if (analysis.clientIdentification) {
      console.log("🏦 Structured client identification data:", analysis.clientIdentification);
    }

    const scores = this.mockClients.map((client) => {
      const score = this.calculateClientScore(client, extractedText, analysis);
      console.log(`👤 ${client.name}: Score ${score.total} (Name: ${score.name}, Banking: ${score.banking}, Birth: ${score.birth})`);
      return { client, score };
    });

    // Sort by total score (highest first)
    scores.sort((a, b) => b.score.total - a.score.total);

    const bestMatch = scores[0];
    const threshold = 30; // Minimum score to consider a match

    if (bestMatch.score.total >= threshold) {
      console.log(`✅ Client identified: ${bestMatch.client.name} (Score: ${bestMatch.score.total})`);
      return bestMatch.client;
    }

    console.log("❌ No client identified with sufficient confidence");
    return null;
  }

  /**
   * Calculate identification score for a client based on multiple criteria
   * @param {Object} client - Client data
   * @param {string} extractedText - Extracted text from document
   * @param {Object} analysis - Full analysis object
   * @returns {Object} - Score breakdown
   */
  calculateClientScore(client, extractedText, analysis) {
    const scores = {
      name: 0,
      banking: 0,
      birth: 0,
      total: 0,
    };

    // 1. Name matching (40 points max)
    scores.name = this.calculateNameScore(client, extractedText, analysis);

    // 2. Banking products matching (40 points max)
    scores.banking = this.calculateBankingScore(client, extractedText, analysis);

    // 3. Birth date matching (20 points max)
    scores.birth = this.calculateBirthDateScore(client, extractedText, analysis);

    // Calculate total with bonuses for combinations
    scores.total = scores.name + scores.banking + scores.birth;

    // Bonus for having multiple matches
    const matchTypes = [scores.name > 0, scores.banking > 0, scores.birth > 0].filter(Boolean).length;
    if (matchTypes >= 2) {
      scores.total += 10; // Combination bonus
    }
    if (matchTypes === 3) {
      scores.total += 20; // Perfect match bonus
    }

    return scores;
  }

  /**
   * Calculate name matching score
   * @param {Object} client - Client data
   * @param {string} text - Extracted text
   * @param {Object} analysis - Full analysis object
   * @returns {number} - Name score (0-40)
   */
  calculateNameScore(client, text, analysis) {
    let score = 0;

    // Check structured data first if available
    if (analysis?.clientIdentification?.names) {
      for (const name of analysis.clientIdentification.names) {
        const nameLower = name.toLowerCase();
        if (nameLower.includes(client.name.toLowerCase())) {
          score = Math.max(score, 40);
        } else if (nameLower.includes(client.firstName.toLowerCase()) && nameLower.includes(client.lastName.toLowerCase())) {
          score = Math.max(score, 35);
        } else if (nameLower.includes(client.lastName.toLowerCase())) {
          score = Math.max(score, 20);
        } else if (nameLower.includes(client.firstName.toLowerCase())) {
          score = Math.max(score, 15);
        }
      }
    }

    // Fallback to text analysis if no structured data or no match found
    if (score === 0) {
      // Full name exact match (40 points)
      if (text.includes(client.name.toLowerCase())) {
        score = 40;
      }
      // First and last name separately (30 points)
      else if (text.includes(client.firstName.toLowerCase()) && text.includes(client.lastName.toLowerCase())) {
        score = 30;
      }
      // Last name only (15 points)
      else if (text.includes(client.lastName.toLowerCase())) {
        score = 15;
      }
      // First name only (10 points)
      else if (text.includes(client.firstName.toLowerCase())) {
        score = 10;
      }
    }

    return score;
  }

  /**
   * Calculate banking products matching score
   * @param {Object} client - Client data
   * @param {string} text - Extracted text
   * @param {Object} analysis - Full analysis object
   * @returns {number} - Banking score (0-40)
   */
  calculateBankingScore(client, text, analysis) {
    let score = 0;

    // Check structured data first if available
    if (analysis?.clientIdentification?.accountNumbers) {
      for (const accountRef of analysis.clientIdentification.accountNumbers) {
        const accountRefClean = accountRef.replace(/\s/g, "").toLowerCase();

        for (const account of client.accounts) {
          const accountNumberClean = account.accountNumber.replace(/\s/g, "").toLowerCase();
          const ibanClean = account.iban ? account.iban.replace(/\s/g, "").toLowerCase() : "";

          if (accountRefClean.includes(accountNumberClean) || accountNumberClean.includes(accountRefClean)) {
            score += 25; // Higher score for structured data
          } else if (ibanClean && (accountRefClean.includes(ibanClean) || ibanClean.includes(accountRefClean))) {
            score += 20;
          }
        }
      }
    }

    // Check banking products mentioned
    if (analysis?.clientIdentification?.bankingProducts) {
      for (const product of analysis.clientIdentification.bankingProducts) {
        const productLower = product.toLowerCase();
        for (const account of client.accounts) {
          if (productLower.includes(account.type)) {
            score += 5; // Small bonus for product type match
          }
        }
      }
    }

    // Fallback to text analysis if no structured data or no match found
    if (score === 0) {
      for (const account of client.accounts) {
        // Account number exact match (20 points per account, max 40)
        if (text.includes(account.accountNumber.toLowerCase().replace(/\s/g, ""))) {
          score += 20;
        }
        // IBAN match (15 points per account)
        else if (account.iban && text.includes(account.iban.toLowerCase().replace(/\s/g, ""))) {
          score += 15;
        }
        // Partial account number match (last 4 digits, 5 points)
        else {
          const lastFourDigits = account.accountNumber.replace(/\D/g, "").slice(-4);
          if (lastFourDigits && text.includes(lastFourDigits)) {
            score += 5;
          }
        }
      }
    }

    // Cap at 40 points
    return Math.min(score, 40);
  }

  /**
   * Calculate birth date matching score
   * @param {Object} client - Client data
   * @param {string} text - Extracted text
   * @param {Object} analysis - Full analysis object
   * @returns {number} - Birth date score (0-20)
   */
  calculateBirthDateScore(client, text, analysis) {
    if (!client.birthdate) return 0;

    const birthDate = new Date(client.birthdate);
    const year = birthDate.getFullYear().toString();
    const month = (birthDate.getMonth() + 1).toString().padStart(2, "0");
    const day = birthDate.getDate().toString().padStart(2, "0");

    let score = 0;

    // Check structured data first if available
    if (analysis?.clientIdentification?.dates) {
      for (const dateStr of analysis.clientIdentification.dates) {
        if (this.isDateMatch(dateStr, client.birthdate)) {
          score = Math.max(score, 20);
          break;
        }
      }
    }

    // Fallback to text analysis if no structured data or no match found
    if (score === 0) {
      // Full date match in various formats
      const dateFormats = [
        `${year}-${month}-${day}`, // 1985-03-15
        `${day}.${month}.${year}`, // 15.03.1985
        `${day}/${month}/${year}`, // 15/03/1985
        `${month}/${day}/${year}`, // 03/15/1985
        `${day}-${month}-${year}`, // 15-03-1985
      ];

      for (const format of dateFormats) {
        if (text.includes(format)) {
          score = 20;
          break;
        }
      }

      // Partial matches if no full date found
      if (score === 0) {
        // Birth year (10 points)
        if (text.includes(year)) {
          score += 10;
        }
        // Month and day combination (5 points)
        if (text.includes(`${day}.${month}`) || text.includes(`${month}/${day}`)) {
          score += 5;
        }
      }
    }

    return score;
  }

  /**
   * Check if a date string matches a client's birthdate
   * @param {string} dateStr - Date string from document
   * @param {string} clientBirthdate - Client's birthdate
   * @returns {boolean} - True if dates match
   */
  isDateMatch(dateStr, clientBirthdate) {
    try {
      const clientDate = new Date(clientBirthdate);

      // Try different date parsing approaches
      const dateFormats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/, // DD.MM.YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
      ];

      for (const format of dateFormats) {
        const match = dateStr.match(format);
        if (match) {
          let day, month, year;

          if (format.toString().includes("(\\d{4})")) {
            // Year first
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
          } else {
            // Day/Month first
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
          }

          const parsedDate = new Date(year, month - 1, day);

          return parsedDate.getFullYear() === clientDate.getFullYear() && parsedDate.getMonth() === clientDate.getMonth() && parsedDate.getDate() === clientDate.getDate();
        }
      }
    } catch (error) {
      console.warn("Date parsing error:", error);
    }

    return false;
  }

  /**
   * Get all clients for testing/demo purposes
   * @returns {Array} - Array of all mock clients
   */
  getAllClients() {
    return this.mockClients;
  }

  /**
   * Get client by ID
   * @param {string} clientId - Client ID
   * @returns {Object|null} - Client data or null
   */
  getClientById(clientId) {
    return this.mockClients.find((client) => client.id === clientId) || null;
  }
}

export const clientIdentificationService = new ClientIdentificationService();
