import { supabase } from "../../supabase.js";

const FREEAGENT_CONNECT_URL = "https://qxoynttvipducubmczwl.supabase.co/functions/v1/freeagent-connect";

export async function loadFreeAgentStatus() {
  const statusElement = document.getElementById("freeagentConnectionStatus");
  const connectButton = document.getElementById("connectFreeAgentButton");
  if (!statusElement || !connectButton) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      statusElement.textContent = "Not logged in.";
      connectButton.disabled = true;
      return;
    }

    const { data, error } = await supabase
      .from("freeagent_connections")
      .select("company_name,connected_at")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      statusElement.innerHTML = `<strong style="color:green;">✅ FreeAgent connected</strong><br><small>${data.company_name || "FreeAgent account connected to JobPilot."}</small>`;
      connectButton.textContent = "📊 FreeAgent Connected";
      connectButton.disabled = true;
    } else {
      statusElement.innerHTML = `<strong>Not connected</strong><br><small>Connect FreeAgent to link your accounting data.</small>`;
      connectButton.textContent = "📊 Connect FreeAgent";
      connectButton.disabled = false;
    }
  } catch (error) {
    console.error("FreeAgent status error:", error);
    statusElement.textContent = "Could not check FreeAgent connection.";
  }
}

export async function connectFreeAgent(buttonOverride = null) {
  const button = buttonOverride || document.getElementById("connectFreeAgentButton");
  if (button) {
    button.disabled = true;
    button.textContent = "Connecting to FreeAgent...";
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("You are not logged in.");

    const response = await fetch(FREEAGENT_CONNECT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: session.access_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "connect",
        origin: window.location.origin
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not connect FreeAgent.");
    if (!result.url) throw new Error("FreeAgent did not return an authorisation URL.");

    window.location.href = result.url;
  } catch (error) {
    console.error("FreeAgent connection error:", error);
    alert("Could not connect FreeAgent:\n\n" + error.message);
    if (button) {
      button.disabled = false;
      button.textContent = "📊 Connect FreeAgent";
    }
  }
}

// Management > Accounting creates the visible FreeAgent button dynamically.
// Use event delegation so the handler always follows that button, even when
// the accounting panel is re-rendered or duplicate legacy elements exist.
if (!window.__jobPilotFreeAgentClickHandler) {
  window.__jobPilotFreeAgentClickHandler = true;
  document.addEventListener("click", event => {
    const button = event.target?.closest?.("#managementFreeAgentButton");
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    connectFreeAgent(button);
  }, true);
}

window.JobPilotFreeAgent = { loadFreeAgentStatus, connectFreeAgent };
