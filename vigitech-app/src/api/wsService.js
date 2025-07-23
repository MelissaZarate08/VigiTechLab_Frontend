const WS_URL = "ws://vigitech-ws.namixcode.cc:9090/ws";
const RECONNECT_DELAY = 3000;

export function initWebSocket(callback) {
  let ws;

  function connect() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => console.log("WebSocket conectado");
    ws.onerror = err => console.error("WebSocket error", err);

    ws.onclose = e => {
      console.warn(`WebSocket cerrado (code ${e.code}). Reconectando en ${RECONNECT_DELAY}ms...`);
      setTimeout(connect, RECONNECT_DELAY);
    };

    ws.onmessage = event => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error("Error parseando JSON WS:", e, event.data);
        return;
      }
      callback(data);
    };
  }

  connect();
  return {
    close: () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  };
}
