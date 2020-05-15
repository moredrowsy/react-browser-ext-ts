import browser from 'webextension-polyfill';

console.log('content.js loaded');

// One-time receive
// From popup.js -> content.js
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.from === 'popup' && msg.to === 'content') {
    console.log(
      `Received one-time request from ${msg.from}/${sender.id}.`,
      msg
    );
    return Promise.resolve({ msg: 'Content got your request!' });
  }
});
