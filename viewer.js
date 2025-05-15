// JavaScript

function showLoader() {
  document.getElementById("loader").style.display = "flex";
}

function hideLoader() {
  document.getElementById("loader").style.display = "none";
}

document.getElementById("zipInput").addEventListener("change", async function (e) {
  const file = e.target.files[0];
  if (!file) return;
  showLoader();
  try {
    await handleZipFile(file);
  } catch (err) {
    console.error(err);
    alert("Failed to process ZIP file.");
  }
  hideLoader();
});

async function handleZipFile(file) {
  const zip = await JSZip.loadAsync(file);
  let chatText = "";
  const mediaFiles = {};

  await Promise.all(Object.keys(zip.files).map(async filename => {
    if (filename.endsWith(".txt")) {
      chatText = await zip.files[filename].async("string");
    } else {
      const blob = await zip.files[filename].async("blob");
      mediaFiles[filename] = URL.createObjectURL(blob);
    }
  }));

  if (!chatText) {
    alert("No .txt chat file found in ZIP.");
    return;
  }

  const lines = chatText.split(/\r?\n/);
  const chatContainer = document.getElementById("chatContainer");
  chatContainer.innerHTML = "";

  let currentMessage = null;

  lines.forEach(line => {
    const isNewMsg = /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}/.test(line);

    if (isNewMsg) {
      if (currentMessage) {
        chatContainer.appendChild(createMessageDiv(currentMessage, mediaFiles));
      }
      currentMessage = line;
    } else if (currentMessage) {
      currentMessage += "\n" + line;
    }
  });

  if (currentMessage) {
    chatContainer.appendChild(createMessageDiv(currentMessage, mediaFiles));
  }
}

function createMessageDiv(msg, mediaLinks) {
  const div = document.createElement("div");
  div.className = "message";

  // Extract timestamp
  const timeMatch = msg.match(/^(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}(?: ?[ap]m)?) - /);
  const timestamp = timeMatch ? timeMatch[1] : "";
  const msgWithoutTime = msg.replace(/^(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}(?: ?[ap]m)?) - /, "");

  // Extract sender and message
  let sender = "";
  let messageBody = msgWithoutTime;

  const senderMatch = msgWithoutTime.match(/^([^:]+?):\s([\s\S]*)/);
  if (senderMatch) {
    sender = senderMatch[1];
    messageBody = senderMatch[2];
  }

  // Split message lines
  let lines = messageBody.split(/\r?\n/);

  // Remove lines that are media file indicators
  lines = lines.filter(line => !line.match(/^IMG-\d{8}-WA\d{4}\.(jpg|jpeg|png|mp4|opus) \(file attached\)$/i));

  // Recombine clean message
  const cleanMessage = lines.join("\n").trim();

  // Add sender
  if (sender) {
    const senderEl = document.createElement("strong");
    senderEl.innerText = sender;
    senderEl.style.display = "block";
    senderEl.style.marginBottom = "5px";
    div.appendChild(senderEl);
  }

  // Add media if available
  const mediaFileMatch = messageBody.match(/(IMG-\d{8}-WA\d{4}\.(jpg|jpeg|png|mp4|opus))/i);
  if (mediaFileMatch) {
    const mediaFile = mediaFileMatch[1];
    const url = mediaLinks[mediaFile];
    if (url) {
      if (mediaFile.endsWith(".mp4")) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.className = "media";
        div.appendChild(video);
      } else if (mediaFile.endsWith(".opus")) {
        const audio = document.createElement("audio");
        audio.src = url;
        audio.controls = true;
        audio.className = "media";
        div.appendChild(audio);
      } else {
        const img = document.createElement("img");
        img.src = url;
        img.className = "media";
        div.appendChild(img);
      }
    }
  }

  // Add message text
  if (cleanMessage) {
    const content = document.createElement("div");
    content.innerText = cleanMessage;
    div.appendChild(content);
  }

  // Add timestamp
  const ts = document.createElement("div");
  ts.className = "timestamp";
  ts.innerText = timestamp;
  div.appendChild(ts);

  return div;
}
