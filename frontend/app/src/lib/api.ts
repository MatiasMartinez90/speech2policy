import { getAuthToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = await this.getHeaders();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  // Chat endpoints
  async sendMessage(message: string, sessionId?: string) {
    return this.request('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  async getSessions() {
    return this.request('/api/chat/sessions');
  }

  async getSession(sessionId: string) {
    return this.request(`/api/chat/sessions/${sessionId}`);
  }

  async deleteSession(sessionId: string) {
    return this.request(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Policy endpoints
  async getPolicyHistory(limit: number = 20) {
    return this.request(`/api/policies/history?limit=${limit}`);
  }

  // User endpoints
  async getUserProfile() {
    return this.request('/api/user/profile');
  }
}

export const apiClient = new APIClient(API_URL);
