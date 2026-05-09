import type { LiveProvider, LiveEvent } from "@refinedev/core";

const API_URL = import.meta.env.VITE_API_URL || "";

type SubscriptionCallback = (event: LiveEvent) => void;

interface Subscription {
  channel: string;
  callback: SubscriptionCallback;
}

let eventSource: EventSource | null = null;
const subscriptions: Subscription[] = [];

function connect() {
  if (eventSource?.readyState === EventSource.OPEN) {
    return;
  }

  eventSource = new EventSource(`${API_URL}/api/v1/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type;

      // Map SSE events to refine LiveEvents
      let liveEvent: LiveEvent | null = null;

      switch (eventType) {
        case "ams_update":
          liveEvent = {
            channel: "ams",
            type: "updated",
            payload: { ids: ["ams"] },
            date: new Date(),
          };
          break;
        case "printer_status":
          liveEvent = {
            channel: "printers",
            type: "updated",
            payload: { ids: ["status"] },
            date: new Date(),
          };
          break;
        case "tray_change":
          liveEvent = {
            channel: "trays",
            type: "updated",
            payload: { ids: data.data?.tray_index ? [String(data.data.tray_index)] : [] },
            date: new Date(),
          };
          break;
        case "connected":
          console.log("SSE connected");
          break;
        default:
          break;
      }

      if (liveEvent) {
        subscriptions.forEach((sub) => {
          if (sub.channel === "*" || sub.channel === liveEvent?.channel) {
            sub.callback(liveEvent);
          }
        });
      }
    } catch (error) {
      console.error("Failed to parse SSE event:", error);
    }
  };

  eventSource.onerror = () => {
    console.warn("SSE connection error, will retry...");
    eventSource?.close();
    eventSource = null;

    // Reconnect after a delay
    setTimeout(connect, 5000);
  };
}

function disconnect() {
  eventSource?.close();
  eventSource = null;
}

export const liveProvider: LiveProvider = {
  subscribe: ({ channel, callback }) => {
    const subscription: Subscription = {
      channel: channel || "*",
      callback,
    };

    subscriptions.push(subscription);

    // Connect if this is the first subscription
    if (subscriptions.length === 1) {
      connect();
    }

    // Return unsubscribe function
    return () => {
      const index = subscriptions.indexOf(subscription);
      if (index > -1) {
        subscriptions.splice(index, 1);
      }

      // Disconnect if no more subscriptions
      if (subscriptions.length === 0) {
        disconnect();
      }
    };
  },

  unsubscribe: (unsubscribeFn) => {
    unsubscribeFn();
  },
};
