const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatArea = document.getElementById("chatArea");

/* =========================
   🔑 OPENAI / OPENROUTER API
   ========================= */
const API_KEY = "AIzaSyC6rj295SBMrbvjyTnZ-uDl4vDJB0PmhkY";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

/* =========================
   💾 CHAT HISTORY
   ========================= */
let chatHistory = JSON.parse(localStorage.getItem("dsr_chat")) || [];

/* =========================
   🎤 MIC (Voice → Text)
   ========================= */
let recognition;
if ("webkitSpeechRecognition" in window) {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;

  recognition.onresult = function (event) {
    input.value = event.results[0][0].transcript;
  };
}

// Ctrl + M → mic start
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.key.toLowerCase() === "m") {
    if (recognition) recognition.start();
  }
});

/* =========================
   📎 FILE ATTACH
   ========================= */
let selectedFileInfo = "";

// Ctrl + F → gallery / file picker
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.key.toLowerCase() === "f") {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "*/*";
    fileInput.click();

    fileInput.onchange = function () {
      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        selectedFileInfo =
          `File name: ${file.name}\nType: ${file.type || "unknown"}\nSize: ${(file.size / 1024).toFixed(2)} KB`;

        addMessage("📎 File selected: " + file.name, "user");
      }
    };
  }
});

/* =========================
   SEND EVENTS
   ========================= */
sendBtn.addEventListener("click", sendMessage);
input.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

/* =========================
   ADD MESSAGE + COPY + SAVE
   ========================= */
function addMessage(text, type, save = true) {
  const welcome = document.querySelector(".welcome");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = `msg ${type}`;
  div.innerText = text;

  // Copy button only for AI
  if (type === "bot") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "Copy";

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.innerText = "Copied!";
      setTimeout(() => (copyBtn.innerText = "Copy"), 1000);
    };

    div.appendChild(document.createElement("br"));
    div.appendChild(copyBtn);
  }

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;

  // Save chat
  if (save) {
    chatHistory.push({ text, type });
    localStorage.setItem("dsr_chat", JSON.stringify(chatHistory));
  }
}

/* =========================
   SEND MESSAGE TO AI
   ========================= */
async function sendMessage() {
  let text = input.value.trim();
  if (!text && !selectedFileInfo) return;

  if (selectedFileInfo) {
    text += "\n\nAttached file info:\n" + selectedFileInfo;
    selectedFileInfo = "";
  }

  addMessage(text, "user");
  input.value = "";

  const typing = document.createElement("div");
  typing.className = "msg bot";
  typing.innerText = "DSR OGGY is thinking...";
  chatArea.appendChild(typing);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are DSR OGGY AI, a helpful assistant." },
          { role: "user", content: text }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    typing.remove();

    if (data.error) {
      addMessage("❌ API Error: " + data.error.message, "bot");
      return;
    }

    if (!data.choices || data.choices.length === 0) {
      addMessage("❌ No response from AI", "bot");
      return;
    }

    addMessage(data.choices[0].message.content, "bot");

  } catch (err) {
    console.error(err);
    typing.remove();
    addMessage("❌ Network / API Error", "bot");
  }
}

/* =========================
   LOAD OLD CHAT ON PAGE LOAD
   ========================= */
window.addEventListener("load", () => {
  chatHistory.forEach(msg => {
    addMessage(msg.text, msg.type, false);
  });
});

