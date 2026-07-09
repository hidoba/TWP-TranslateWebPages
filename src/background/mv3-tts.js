"use strict";

const twpOffscreenTextToSpeechTarget = "twp-offscreen-text-to-speech";
let twpCreatingOffscreenDocument = null;

async function twpHasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL("background/offscreen.html");

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });
    return contexts.length > 0;
  }

  const matchedClients = await clients.matchAll();
  return matchedClients.some((client) => client.url === offscreenUrl);
}

async function twpEnsureOffscreenDocument() {
  if (!chrome.offscreen) return false;
  if (await twpHasOffscreenDocument()) return true;

  if (!twpCreatingOffscreenDocument) {
    twpCreatingOffscreenDocument = chrome.offscreen
      .createDocument({
        url: "background/offscreen.html",
        reasons: ["AUDIO_PLAYBACK"],
        justification: "Play translated text-to-speech audio.",
      })
      .finally(() => {
        twpCreatingOffscreenDocument = null;
      });
  }

  await twpCreatingOffscreenDocument;
  return true;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.target === twpOffscreenTextToSpeechTarget) return;

  if (request.action === "textToSpeech" || request.action === "stopAudio") {
    twpEnsureOffscreenDocument()
      .then((created) => {
        if (!created) {
          sendResponse();
          return;
        }

        chrome.runtime.sendMessage(
          {
            ...request,
            target: twpOffscreenTextToSpeechTarget,
          },
          () => {
            checkedLastError();
            sendResponse();
          }
        );
      })
      .catch((error) => {
        console.error(error);
        sendResponse();
      });

    return true;
  }
});
