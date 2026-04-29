import { escapeHtml } from "../common/html";
import type { SpecBinding } from "../specs/types";
import type { TeamDeliveryState, TeamMessage } from "../teamBus/types";

export function renderTeamChatroomHtml(
  spec: SpecBinding | undefined,
  messages: TeamMessage[],
  deliveries: TeamDeliveryState[] = []
): string {
  const messagesJson = JSON.stringify(messages).replace(/</g, "\\u003c");
  const deliveriesJson = JSON.stringify(deliveries).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root { color-scheme: dark; --line:#333; --text:#d4d4d4; --muted:#8f8f8f; --panel:#202020; --accent:#4cc2ff; }
    * { box-sizing: border-box; }
    body { margin: 0; height: 100vh; display: flex; flex-direction: column; background: #181818; color: var(--text); font: 13px/1.45 "Segoe UI", sans-serif; }
    .room { min-width: 0; min-height: 0; display: flex; flex-direction: column; flex: 1; }
    header { padding: 10px 12px; border-bottom: 1px solid var(--line); }
    .label { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0; }
    .mono { font-family: Consolas, monospace; overflow-wrap: anywhere; }
    .messages { flex: 1; min-height: 0; overflow: auto; padding: 10px 12px; }
    .message { border: 1px solid #333; background: var(--panel); border-radius: 6px; padding: 8px; margin-bottom: 8px; white-space: pre-wrap; }
    .message b { color: var(--accent); }
    .delivery { margin-top: 6px; color: var(--muted); font-size: 12px; }
    .delivery strong { color: var(--text); font-weight: 600; }
    .empty { color: var(--muted); padding: 10px 0; }
    #status { color: var(--muted); margin-top: 4px; }
  </style>
</head>
<body>
  <section class="room">
    <header>
      <div class="label">Team Chatroom</div>
      <div class="mono">${spec ? escapeHtml(spec.specDir) : "No active Spec"}</div>
      <div id="status"></div>
    </header>
    <div class="messages" id="messages"></div>
  </section>
  <script>
    const messages = ${messagesJson};
    let deliveries = ${deliveriesJson};
    const messagesEl = document.querySelector("#messages");
    const status = document.querySelector("#status");

    function escapeText(value) {
      return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
    }

    function renderMessages() {
      messagesEl.innerHTML = messages.length
        ? messages
        .map(message => '<div class="message"><b>' + escapeText(message.from) + ' -> ' + escapeText(message.to) + '</b><br>' + escapeText(message.subject) + '<br><span>' + escapeText(message.body) + '</span>' + deliveryHtml(message.id) + '</div>')
        .join('')
        : '<div class="empty">No TeamBus messages yet.</div>';
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function deliveryHtml(messageId) {
      const state = deliveries.filter(delivery => delivery.messageId === messageId);
      if (!state.length) {
        return '<div class="delivery">delivery: <strong>not recorded</strong></div>';
      }
      return '<div class="delivery">delivery: ' + state.map(delivery =>
        '<strong>' + escapeText(delivery.recipient) + '</strong> ' +
        escapeText(delivery.state) +
        (delivery.requiresResponse ? ' · response required' : ' · no response') +
        (delivery.responseMessageId ? ' · response ' + escapeText(delivery.responseMessageId) : '')
      ).join(' · ') + '</div>';
    }

    function appendMessage(message) {
      if (!message || messages.some(candidate => candidate.id === message.id)) return;
      messages.push(message);
      renderMessages();
    }

    window.addEventListener("message", event => {
      if (event.data.type === "teamMessage") {
        appendMessage(event.data.message);
        status.textContent = "TeamBus message: " + event.data.message.id;
      }
      if (event.data.type === "deliveryStates") {
        deliveries = event.data.deliveries || deliveries;
        renderMessages();
      }
      if (event.data.type === "agentStarted") {
        status.textContent = "Routing " + event.data.role + " via " + event.data.engine + "...";
      }
      if (event.data.type === "agentDone") {
        status.textContent = "Routed response saved.";
      }
      if (event.data.type === "agentError") {
        status.textContent = "Routing failed: " + event.data.error;
      }
    });

    renderMessages();
  </script>
</body>
</html>`;
}

