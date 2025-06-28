const { v4: uuidv4 } = require("uuid");

class MockBankingService {
  constructor() {
    // Mock databases
    this.clientNotes = new Map();
    this.complianceForms = new Map();
    this.clientProfiles = new Map();
    this.followUps = new Map();

    // Initialize with some mock data
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock client profiles
    const mockClients = [
      {
        id: "client_001",
        name: "John Smith",
        email: "john.smith@email.com",
        birthdate: "1978-09-22",
        clientIdentificationNumber: "CIN-JS-2024-001",
        accountNumber: "CH 2050 2222 3456 88 23",
        accounts: [
          {
            type: "checking",
            accountNumber: "CH 2050 2222 3456 88 23",
            iban: "CH20 5022 2234 5688 2300 0",
            currency: "CHF",
            balance: 45200.75,
            status: "active",
            openedDate: "2020-03-10",
          },
          {
            type: "savings",
            accountNumber: "CH 2050 2222 3456 88 24",
            iban: "CH20 5022 2234 5688 2400 0",
            currency: "CHF",
            balance: 125000.0,
            status: "active",
            openedDate: "2020-03-10",
          },
          {
            type: "investment",
            accountNumber: "CH 2050 2222 3456 88 25",
            iban: "CH20 5022 2234 5688 2500 0",
            currency: "CHF",
            balance: 380000.0,
            status: "active",
            openedDate: "2021-07-15",
          },
        ],
        ibans: ["CH20 5022 2234 5688 2300 0", "CH20 5022 2234 5688 2400 0", "CH20 5022 2234 5688 2500 0"],
        riskProfile: "moderate",
        portfolio: ["stocks", "bonds"],
        lastContact: "2024-01-15",
        createdAt: "2020-03-10T00:00:00.000Z",
        status: "active",
        notes: "Long-term client with moderate risk appetite, diversified portfolio",
        nationality: "Swiss",
        address: {
          street: "Limmatquai 45",
          city: "Zurich",
          postalCode: "8001",
          country: "Switzerland",
        },
        phone: "+41 44 234 5678",
        preferredLanguage: "de",
      },
      {
        id: "client_002",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        birthdate: "1990-12-08",
        clientIdentificationNumber: "CIN-SJ-2024-002",
        accountNumber: "CH 3050 3333 4567 99 34",
        accounts: [
          {
            type: "checking",
            accountNumber: "CH 3050 3333 4567 99 34",
            iban: "CH30 5033 3345 6799 3400 0",
            currency: "CHF",
            balance: 18500.25,
            status: "active",
            openedDate: "2022-11-05",
          },
          {
            type: "savings",
            accountNumber: "CH 3050 3333 4567 99 35",
            iban: "CH30 5033 3345 6799 3500 0",
            currency: "CHF",
            balance: 95000.0,
            status: "active",
            openedDate: "2022-11-05",
          },
          {
            type: "pension",
            accountNumber: "CH 3050 3333 4567 99 36",
            iban: "CH30 5033 3345 6799 3600 0",
            currency: "CHF",
            balance: 45000.0,
            status: "active",
            openedDate: "2023-01-15",
          },
        ],
        ibans: ["CH30 5033 3345 6799 3400 0", "CH30 5033 3345 6799 3500 0", "CH30 5033 3345 6799 3600 0"],
        riskProfile: "conservative",
        portfolio: ["savings", "bonds"],
        lastContact: "2024-01-10",
        createdAt: "2022-11-05T00:00:00.000Z",
        status: "active",
        notes: "Conservative investor focused on capital preservation and steady growth",
        nationality: "American",
        address: {
          street: "Seestrasse 78",
          city: "Geneva",
          postalCode: "1204",
          country: "Switzerland",
        },
        phone: "+41 22 345 6789",
        preferredLanguage: "en",
      },
      {
        id: "client_003",
        name: "Jane Smith",
        email: "jane.smith@email.com",
        birthdate: "1985-03-15",
        clientIdentificationNumber: "CIN-JS-2025-001",
        accountNumber: "CH 1050 1111 2345 77 12",
        accounts: [
          {
            type: "checking",
            accountNumber: "CH 1050 1111 2345 77 12",
            iban: "CH10 5011 1123 4577 1200 0",
            currency: "CHF",
            balance: 25750.5,
            status: "active",
            openedDate: "2023-06-15",
          },
          {
            type: "savings",
            accountNumber: "CH 1050 1111 2345 77 13",
            iban: "CH10 5011 1123 4577 1300 0",
            currency: "CHF",
            balance: 85000.0,
            status: "active",
            openedDate: "2023-06-15",
          },
          {
            type: "investment",
            accountNumber: "CH 1050 1111 2345 77 14",
            iban: "CH10 5011 1123 4577 1400 0",
            currency: "CHF",
            balance: 150000.0,
            status: "active",
            openedDate: "2024-01-10",
          },
        ],
        ibans: ["CH10 5011 1123 4577 1200 0", "CH10 5011 1123 4577 1300 0", "CH10 5011 1123 4577 1400 0"],
        riskProfile: "not_assessed",
        portfolio: [],
        lastContact: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        status: "active",
        notes: "Client added from advisory meeting minutes document",
        nationality: "Swiss",
        address: {
          street: "Bahnhofstrasse 123",
          city: "Zurich",
          postalCode: "8001",
          country: "Switzerland",
        },
        phone: "+41 44 123 4567",
        preferredLanguage: "en",
      },
    ];

    mockClients.forEach((client) => {
      this.clientProfiles.set(client.id, client);
    });

    console.log("🏦 Mock banking service initialized with sample data");
  }

  async createClientNote(actionData) {
    const noteId = uuidv4();
    const note = {
      id: noteId,
      content: actionData.data.noteContent,
      category: actionData.data.category || "general",
      clientId: actionData.clientId || "unknown",
      advisorId: actionData.advisorId || "unknown",
      createdAt: new Date().toISOString(),
      status: "active",
    };

    this.clientNotes.set(noteId, note);

    console.log(`📝 Created client note: ${noteId}`);

    // Simulate processing delay
    await this.simulateDelay(500, 1500);

    return {
      success: true,
      noteId: noteId,
      message: "Client note created successfully",
      data: note,
    };
  }

  async fillComplianceForm(actionData) {
    const formId = uuidv4();
    const form = {
      id: formId,
      type: actionData.data.formType || "KYC",
      requiredFields: actionData.data.requiredFields || [],
      extractedData: actionData.data.extractedData || {},
      clientId: actionData.clientId || "unknown",
      advisorId: actionData.advisorId || "unknown",
      createdAt: new Date().toISOString(),
      status: "pending_review",
      completionPercentage: this.calculateCompletionPercentage(actionData.data.requiredFields || [], actionData.data.extractedData || {}),
    };

    this.complianceForms.set(formId, form);

    console.log(`📋 Created compliance form: ${formId} (${form.type})`);

    // Simulate processing delay
    await this.simulateDelay(1000, 2000);

    return {
      success: true,
      formId: formId,
      message: `${form.type} compliance form created and pre-filled`,
      data: form,
      nextSteps: ["Review auto-filled information", "Complete missing fields", "Submit for compliance approval"],
    };
  }

  async updateClientProfile(actionData) {
    const clientId = actionData.clientId || actionData.data.clientId;

    if (!clientId) {
      throw new Error("Client ID is required for profile update");
    }

    let profile = this.clientProfiles.get(clientId);

    if (!profile) {
      // Create new profile if doesn't exist
      profile = {
        id: clientId,
        name: "Unknown Client",
        email: "",
        riskProfile: "not_assessed",
        portfolio: [],
        lastContact: new Date().toISOString(),
      };
    }

    // Update profile with new data
    const updates = actionData.data.updates || {};
    Object.assign(profile, updates, {
      lastUpdated: new Date().toISOString(),
      updatedBy: actionData.advisorId || "system",
    });

    this.clientProfiles.set(clientId, profile);

    console.log(`👤 Updated client profile: ${clientId}`);

    // Simulate processing delay
    await this.simulateDelay(300, 800);

    return {
      success: true,
      clientId: clientId,
      message: "Client profile updated successfully",
      data: profile,
      updatedFields: Object.keys(updates),
    };
  }

  async scheduleFollowUp(actionData) {
    const followUpId = uuidv4();
    const followUp = {
      id: followUpId,
      clientId: actionData.clientId || "unknown",
      advisorId: actionData.advisorId || "unknown",
      scheduledDate: actionData.data.suggestedDate || this.getDefaultFollowUpDate(),
      purpose: actionData.data.purpose || "General follow-up",
      priority: actionData.priority || "medium",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      reminderSet: true,
      meetingType: actionData.data.meetingType || "in-person",
    };

    this.followUps.set(followUpId, followUp);

    console.log(`📅 Scheduled follow-up: ${followUpId} for ${followUp.scheduledDate}`);

    // Simulate processing delay
    await this.simulateDelay(200, 600);

    return {
      success: true,
      followUpId: followUpId,
      message: "Follow-up meeting scheduled successfully",
      data: followUp,
      calendarInvite: {
        sent: true,
        recipientEmail: this.getClientEmail(followUp.clientId),
      },
    };
  }

  // Utility methods

  calculateCompletionPercentage(requiredFields, extractedData) {
    if (!requiredFields.length) return 0;

    const filledFields = requiredFields.filter((field) => extractedData[field] && extractedData[field].toString().trim() !== "");

    return Math.round((filledFields.length / requiredFields.length) * 100);
  }

  getDefaultFollowUpDate() {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days from now
    return date.toISOString().split("T")[0];
  }

  getClientEmail(clientId) {
    const profile = this.clientProfiles.get(clientId);
    return profile?.email || "client@example.com";
  }

  async simulateDelay(minMs, maxMs) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  // Query methods for dashboard/reporting

  getClientNotes(clientId) {
    const notes = Array.from(this.clientNotes.values());
    return clientId ? notes.filter((note) => note.clientId === clientId) : notes;
  }

  getComplianceForms(status = null) {
    const forms = Array.from(this.complianceForms.values());
    return status ? forms.filter((form) => form.status === status) : forms;
  }

  getClientProfile(clientId) {
    return this.clientProfiles.get(clientId);
  }

  getFollowUps(advisorId = null) {
    const followUps = Array.from(this.followUps.values());
    return advisorId ? followUps.filter((f) => f.advisorId === advisorId) : followUps;
  }

  getSystemStats() {
    return {
      totalNotes: this.clientNotes.size,
      totalForms: this.complianceForms.size,
      totalClients: this.clientProfiles.size,
      totalFollowUps: this.followUps.size,
      pendingForms: this.getComplianceForms("pending_review").length,
      upcomingFollowUps: this.getFollowUps().filter((f) => new Date(f.scheduledDate) > new Date() && f.status === "scheduled").length,
    };
  }
}

module.exports = { MockBankingService };
