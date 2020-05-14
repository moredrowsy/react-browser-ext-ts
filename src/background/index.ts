import browser from 'webextension-polyfill';

console.log('background.js loaded');

// listen for port messages
browser.runtime.onConnect.addListener(port => {
  port.onMessage.addListener(msg => {
    console.log('Background listning to port messsage:', msg);
    port.postMessage({ text: 'Background posting response port msg' });
  });
});

// listen for one-time message
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background listening to onMessage', message);
});
