import type { DataProvider } from "@refinedev/core";
import type { ApiResponse } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "";
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

async function fetchApi<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, filters }) => {
    const params = new URLSearchParams();

    if (pagination && pagination.mode !== "off") {
      params.set("page", "1");
      params.set("per_page", String(pagination.pageSize || 50));
    }

    if (filters) {
      filters.forEach((filter) => {
        if ("field" in filter && filter.value !== undefined) {
          params.set(filter.field, String(filter.value));
        }
      });
    }

    const queryString = params.toString();
    const url = `/api/v1/${resource}${queryString ? `?${queryString}` : ""}`;

    const result = await fetchApi<unknown>(url);

    // Handle different response formats
    const data = result.data;
    let items: unknown[] = [];
    let total = 0;

    if (Array.isArray(data)) {
      items = data;
      total = data.length;
    } else if (data && typeof data === "object") {
      // Check for common list response patterns
      const obj = data as Record<string, unknown>;
      if ("spools" in obj && Array.isArray(obj.spools)) {
        items = obj.spools;
        total = (obj.total as number) || items.length;
      } else if ("prints" in obj && Array.isArray(obj.prints)) {
        items = obj.prints;
        total = (obj.total as number) || items.length;
      } else if ("ams_units" in obj && Array.isArray(obj.ams_units)) {
        items = obj.ams_units;
        total = items.length;
      } else {
        items = [data];
        total = 1;
      }
    }

    return {
      data: items as never[],
      total,
    };
  },

  getOne: async ({ resource, id }) => {
    const result = await fetchApi<unknown>(`/api/v1/${resource}/${id}`);
    return { data: result.data as never };
  },

  create: async ({ resource, variables }) => {
    const result = await fetchApi<unknown>(`/api/v1/${resource}`, {
      method: "POST",
      body: JSON.stringify(variables),
    });
    return { data: result.data as never };
  },

  update: async ({ resource, id, variables }) => {
    const result = await fetchApi<unknown>(`/api/v1/${resource}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(variables),
    });
    return { data: result.data as never };
  },

  deleteOne: async ({ resource, id }) => {
    const result = await fetchApi<unknown>(`/api/v1/${resource}/${id}`, {
      method: "DELETE",
    });
    return { data: result.data as never };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method = "GET", payload, query }) => {
    const params = query ? new URLSearchParams(query as Record<string, string>) : null;
    const fullUrl = `${API_URL}${url}${params ? `?${params}` : ""}`;

    const result = await fetchApi<unknown>(fullUrl, {
      method,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    return { data: result.data as never };
  },
};
