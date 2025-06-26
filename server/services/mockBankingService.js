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
        riskProfile: "moderate",
        portfolio: ["stocks", "bonds"],
        lastContact: "2024-01-15",
      },
      {
        id: "client_002",
        name: "Sarah Johnson",
        email: "sarah.johnson@email.com",
        riskProfile: "conservative",
        portfolio: ["savings", "bonds"],
        lastContact: "2024-01-10",
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
