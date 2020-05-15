import browser from 'webextension-polyfill';

console.log('background.js loaded');

// listen for port messages
browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    console.log(`Received port message from port ${port.name}:`, msg);
    port.postMessage({
      from: 'background',
      to: 'popup',
      msg: `Got port message from ${port.name}!`,
    });
  });
});

// One-time receive
// From popup.js -> background.js
browser.runtime.onMessage.addListener((msg, sender) => {
  if (msg.from === 'popup' && msg.to === 'background') {
    console.log(
      `Received one-time request from ${msg.from}/${sender.id}.`,
      msg
    );
    return Promise.resolve({ msg: 'Background got your request!' });
  }
});
