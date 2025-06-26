import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:7775/api";

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 120000, // 2 minutes for file uploads
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error("Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error("Response error:", error);
        if (error.response) {
          // Server responded with error status
          throw new Error(error.response.data?.error || `Server error: ${error.response.status}`);
        } else if (error.request) {
          // Request made but no response
          throw new Error("No response from server. Please check your connection.");
        } else {
          // Something else happened
          throw new Error(error.message || "An unexpected error occurred");
        }
      }
    );
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get("/health");
    return response.data;
  }

  // Session management
  async createSession(clientAdvisorId, clientId) {
    const response = await this.client.post("/sessions", {
      clientAdvisorId,
      clientId,
    });
    return response.data;
  }

  async getSession(sessionId) {
    const response = await this.client.get(`/sessions/${sessionId}`);
    return response.data;
  }

  async getAllSessions() {
    const response = await this.client.get("/sessions");
    return response.data;
  }

  // Document processing
  async uploadDocument(sessionId, file, onProgress) {
    const formData = new FormData();
    formData.append("document", file);

    const response = await this.client.post(`/sessions/${sessionId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  async processImageCapture(sessionId, imageData) {
    const response = await this.client.post(`/sessions/${sessionId}/capture`, {
      imageData,
    });
    return response.data;
  }

  // Action execution
  async executeAction(sessionId, actionId, actionData) {
    const response = await this.client.post(`/sessions/${sessionId}/actions/${actionId}`, { actionData });
    return response.data;
  }

  // Utility methods
  async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  // Check if file is supported
  isSupportedFile(file) {
    const supportedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

    return supportedTypes.includes(file.type);
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

export const apiService = new ApiService();
