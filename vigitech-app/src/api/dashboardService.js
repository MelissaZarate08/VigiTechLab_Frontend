// src/api/dashboardService.js

const BASE_URL = "http://192.168.115.1:8081";

export function initWebSocket(callback) {
  const ws = new WebSocket("ws://192.168.115.1:9090/ws");

  ws.onopen = () => console.log("WebSocket conectado");
  ws.onerror = (err) => console.error("WebSocket error", err);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      callback(data);
    } catch (e) {
      console.error("Error parseando WebSocket", e);
    }
  };

  return ws;
}