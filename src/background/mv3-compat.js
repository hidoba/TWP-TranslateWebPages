"use strict";

const twpMv3Compat = (() => {
  const isMV3 = chrome.runtime.getManifest().manifest_version >= 3;

  if (isMV3 && chrome.action) {
    if (!chrome.browserAction) {
      chrome.browserAction = chrome.action;
    }

    if (!chrome.pageAction) {
      chrome.pageAction = {
        onClicked: chrome.action.onClicked,
        setPopup: chrome.action.setPopup.bind(chrome.action),
        setIcon: chrome.action.setIcon.bind(chrome.action),
        openPopup: chrome.action.openPopup
          ? chrome.action.openPopup.bind(chrome.action)
          : undefined,
        show(tabId, callback) {
          if (callback) callback();
        },
        hide(tabId, callback) {
          if (callback) callback();
        },
      };
    }
  }

  if (typeof XMLHttpRequest === "undefined") {
    class FetchXMLHttpRequest {
      constructor() {
        this.DONE = 4;
        this.HEADERS_RECEIVED = 2;
        this.LOADING = 3;
        this.OPENED = 1;
        this.UNSENT = 0;

        this.readyState = this.UNSENT;
        this.response = null;
        this.responseText = "";
        this.responseType = "";
        this.responseURL = "";
        this.status = 0;
        this.statusText = "";
        this.timeout = 0;
        this.withCredentials = false;

        this._headers = {};
        this._listeners = {};
        this._responseHeaders = null;
      }

      addEventListener(type, listener) {
        if (!this._listeners[type]) this._listeners[type] = [];
        this._listeners[type].push(listener);
      }

      removeEventListener(type, listener) {
        if (!this._listeners[type]) return;
        this._listeners[type] = this._listeners[type].filter(
          (item) => item !== listener
        );
      }

      dispatchEvent(event) {
        event.target = this;
        const listeners = this._listeners[event.type] || [];
        listeners.forEach((listener) => listener.call(this, event));
        const handler = this["on" + event.type];
        if (typeof handler === "function") handler.call(this, event);
        return true;
      }

      open(method, url) {
        this._method = method;
        this._url = url;
        this.readyState = this.OPENED;
        this.dispatchEvent({ type: "readystatechange" });
      }

      setRequestHeader(name, value) {
        this._headers[name] = value;
      }

      getResponseHeader(name) {
        return this._responseHeaders
          ? this._responseHeaders.get(name.toLowerCase())
          : null;
      }

      getAllResponseHeaders() {
        if (!this._responseHeaders) return "";
        const headers = [];
        this._responseHeaders.forEach((value, name) => {
          headers.push(`${name}: ${value}`);
        });
        return headers.join("\r\n");
      }

      abort() {
        if (this._controller) {
          this._aborted = true;
          this._controller.abort();
        }
      }

      async send(body) {
        this._controller = new AbortController();
        let timeoutId = null;

        if (this.timeout > 0) {
          timeoutId = setTimeout(() => {
            this._timedOut = true;
            this._controller.abort();
          }, this.timeout);
        }

        try {
          const response = await fetch(this._url, {
            method: this._method,
            headers: this._headers,
            body,
            credentials: this.withCredentials ? "include" : "same-origin",
            signal: this._controller.signal,
          });

          this.status = response.status;
          this.statusText = response.statusText;
          this.responseURL = response.url;
          this._responseHeaders = response.headers;
          this.readyState = this.HEADERS_RECEIVED;
          this.dispatchEvent({ type: "readystatechange" });

          if (this.responseType === "json") {
            this.responseText = await response.text();
            this.response = this.responseText
              ? JSON.parse(this.responseText)
              : null;
          } else if (this.responseType === "blob") {
            this.response = await response.blob();
          } else if (this.responseType === "arraybuffer") {
            this.response = await response.arrayBuffer();
          } else {
            this.responseText = await response.text();
            this.response = this.responseText;
          }

          this.readyState = this.DONE;
          this.dispatchEvent({ type: "readystatechange" });
          this.dispatchEvent({ type: "load" });
          this.dispatchEvent({ type: "loadend" });
        } catch (error) {
          this.readyState = this.DONE;
          this.dispatchEvent({ type: "readystatechange" });

          if (this._timedOut) {
            this.dispatchEvent({ type: "timeout", error });
          } else if (this._aborted) {
            this.dispatchEvent({ type: "abort", error });
          } else {
            this.dispatchEvent({ type: "error", error });
          }

          this.dispatchEvent({ type: "loadend" });
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
      }
    }

    globalThis.XMLHttpRequest = FetchXMLHttpRequest;
  }

  return { isMV3 };
})();
