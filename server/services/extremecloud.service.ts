import axios, { AxiosInstance, AxiosError } from "axios";
import { getLatestApiToken, saveApiToken } from "../db";

/**
 * ExtremeCloud IQ API Service
 * Handles authentication, rate limiting, and API communication
 */

const BASE_URL = "https://api.extremecloudiq.com";
const RATE_LIMIT_DELAY = 1000; // Base delay in ms for rate limiting

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface RateLimitState {
  remaining: number;
  limit: number;
  resetTime: number;
}

class ExtremeCloudService {
  private client: AxiosInstance;
  private rateLimitState: RateLimitState = {
    remaining: 7500,
    limit: 7500,
    resetTime: Date.now() + 3600000,
  };

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
    });

    // Add response interceptor to track rate limits
    this.client.interceptors.response.use(
      (response) => {
        this.updateRateLimitState(response.headers);
        return response;
      },
      (error) => {
        if (error.response) {
          this.updateRateLimitState(error.response.headers);
        }
        return Promise.reject(error);
      }
    );
  }

  private updateRateLimitState(headers: any) {
    const remaining = parseInt(headers["ratelimit-remaining"] || "7500", 10);
    const limit = parseInt(headers["ratelimit-limit"] || "7500", 10);

    this.rateLimitState = {
      remaining,
      limit,
      resetTime: Date.now() + 3600000,
    };
  }

  /**
   * Login to ExtremeCloud IQ API
   * Tries multiple authentication endpoints for compatibility
   */
  async login(username: string, password: string): Promise<{ token: string; expiresIn: number }> {
    const errors: string[] = [];

    // Try endpoint 1: Standard /login endpoint
    try {
      const response = await this.client.post<LoginResponse>("/login", {
        username,
        password,
      });

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in,
      };
    } catch (err) {
      errors.push(`Standard login failed: ${(err as Error).message}`);
    }

    // Try endpoint 2: OAuth2 token endpoint
    try {
      const params = new URLSearchParams();
      params.append("grant_type", "password");
      params.append("username", username);
      params.append("password", password);
      params.append("client_id", "XIQ-API");

      const response = await this.client.post<LoginResponse>(
        "/v1/oauth2/token",
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in || 3600,
      };
    } catch (err) {
      errors.push(`OAuth2 login failed: ${(err as Error).message}`);
    }

    // Try endpoint 3: /v1/auth/login endpoint
    try {
      const response = await this.client.post<LoginResponse>("/v1/auth/login", {
        username,
        password,
      });

      return {
        token: response.data.access_token,
        expiresIn: response.data.expires_in || 3600,
      };
    } catch (err) {
      errors.push(`V1 auth login failed: ${(err as Error).message}`);
    }

    // All attempts failed
    throw new Error(`Login failed. Attempted endpoints: ${errors.join(" | ")}`);
  }

  /**
   * Get list of devices with optional filtering
   */
  async getDevices(
    token: string,
    options?: {
      page?: number;
      limit?: number;
      connected?: boolean;
      views?: string;
    }
  ) {
    try {
      await this.checkRateLimit();

      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append("page", String(options.page));
      if (options?.limit !== undefined) params.append("limit", String(options.limit));
      if (options?.connected !== undefined) params.append("connected", String(options.connected));
      if (options?.views) params.append("views", options.views);

      const response = await this.client.get("/devices", {
        headers: { Authorization: `Bearer ${token}` },
        params: Object.fromEntries(params),
      });

      return response.data;
    } catch (error) {
      return this.handleApiError(error, "Failed to fetch devices");
    }
  }

  /**
   * Get single device details
   */
  async getDeviceDetail(token: string, deviceId: string) {
    try {
      await this.checkRateLimit();

      const response = await this.client.get(`/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return response.data;
    } catch (error) {
      return this.handleApiError(error, "Failed to fetch device details");
    }
  }

  /**
   * Execute CLI commands on devices
   */
  async executeCli(
    token: string,
    deviceIds: number[],
    commands: string[],
    options?: { async?: boolean }
  ) {
    try {
      await this.checkRateLimit();

      const response = await this.client.post(
        "/devices/:cli",
        {
          devices: { ids: deviceIds },
          clis: commands,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          params: options?.async ? { async: "true" } : {},
        }
      );

      return response.data;
    } catch (error) {
      return this.handleApiError(error, "Failed to execute CLI commands");
    }
  }

  /**
   * Get connected clients
   */
  async getClients(
    token: string,
    options?: {
      page?: number;
      limit?: number;
      deviceId?: string;
    }
  ) {
    try {
      await this.checkRateLimit();

      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append("page", String(options.page));
      if (options?.limit !== undefined) params.append("limit", String(options.limit));
      if (options?.deviceId) params.append("deviceId", options.deviceId);

      const response = await this.client.get("/clients", {
        headers: { Authorization: `Bearer ${token}` },
        params: Object.fromEntries(params),
      });

      return response.data;
    } catch (error) {
      return this.handleApiError(error, "Failed to fetch clients");
    }
  }

  /**
   * Get alerts with optional filtering
   */
  async getAlerts(
    token: string,
    options?: {
      page?: number;
      limit?: number;
      severity?: string;
      category?: string;
    }
  ) {
    try {
      await this.checkRateLimit();

      const params = new URLSearchParams();
      if (options?.page !== undefined) params.append("page", String(options.page));
      if (options?.limit !== undefined) params.append("limit", String(options.limit));
      if (options?.severity) params.append("severity", options.severity);
      if (options?.category) params.append("category", options.category);

      const response = await this.client.get("/alerts", {
        headers: { Authorization: `Bearer ${token}` },
        params: Object.fromEntries(params),
      });

      return response.data;
    } catch (error) {
      return this.handleApiError(error, "Failed to fetch alerts");
    }
  }

  /**
   * Check rate limit and apply exponential backoff if needed
   */
  private async checkRateLimit() {
    if (this.rateLimitState.remaining <= 10) {
      // If we're running low on rate limit, wait before making the request
      const waitTime = Math.min(
        RATE_LIMIT_DELAY * Math.pow(2, 3),
        this.rateLimitState.resetTime - Date.now()
      );
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Handle API errors with distinction between network and API errors
   */
  private handleApiError(error: any, defaultMessage: string) {
    const axiosError = error as AxiosError;

    // Network error or timeout
    if (!axiosError.response) {
      return {
        error: "NETWORK_ERROR",
        message: axiosError.message || "Network connection failed",
        status: "UNKNOWN",
      };
    }

    // Rate limit error
    if (axiosError.response.status === 429) {
      return {
        error: "RATE_LIMIT",
        message: "API rate limit exceeded",
        status: "RATE_LIMIT",
        retryAfter: axiosError.response.headers["retry-after"] || "60",
      };
    }

    // Authentication error
    if (axiosError.response.status === 401) {
      return {
        error: "AUTH_ERROR",
        message: "Authentication failed",
        status: "AUTH_ERROR",
      };
    }

    // Other API errors
    return {
      error: "API_ERROR",
      message: defaultMessage,
      status: axiosError.response.status,
      details: (axiosError.response.data as any)?.error_message || axiosError.message,
    };
  }

  /**
   * Get current rate limit state
   */
  getRateLimitState() {
    return this.rateLimitState;
  }
}

export const extremeCloudService = new ExtremeCloudService();
