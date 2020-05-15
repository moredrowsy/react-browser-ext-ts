import browser from 'webextension-polyfill';
import React, { Component } from 'react';

import ReactLogo from '../assets/img/logo.svg';
import distPng from '../assets/img/dist.png';
import './Popup.css';

class Popup extends Component {
  state = {
    data: 'Hello from Popup.js using React!',
    tab: undefined as any,
    port: undefined as any,
  };

  // example to setup tab, port, and messages
  async componentDidMount() {
    // Port connection with background.js
    const port = browser.runtime.connect(undefined, { name: 'popup' });
    this.setState({ port: port });

    // Get active tab
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.setState({ tab: tabs[0] });

    // Send port message with tab info
    this.state.port.postMessage({
      from: 'popup',
      to: 'background',
      msg: 'Popup posting port message',
      tab: this.state.tab,
    });

    // Listen for port messages
    this.state.port.onMessage.addListener((msg: any) => {
      console.log('Received port message:', msg);
    });

    // One-time send
    // From popup.js -> background.js
    browser.runtime
      .sendMessage({
        from: 'popup',
        to: 'background',
        msg: 'Hello from Popup to Background!',
      })
      .then((resp) => {
        if (resp) console.log('Received one-time response!', resp.msg);
      })
      .catch((e) =>
        console.log('One-time request error to background.', e.message)
      );

    // One-time send
    // From popup.js -> content.js
    browser.tabs
      .sendMessage(this.state.tab.id, {
        from: 'popup',
        to: 'content',
        msg: 'Hello from Popup to Content!',
      })
      .then((resp) => {
        if (resp) console.log('Received one-time response!', resp.msg);
      })
      .catch((e) =>
        console.log('One-time request error to content_scripts.', e.message)
      );

    // One-time receive
    // From anyone -> popup.js
    browser.runtime.onMessage.addListener((msg, sender) => {
      console.log(`Received one-time message from anyone/${sender.id}.`, msg);
      return Promise.resolve({ msg: 'Popup got your request!' });
    });

    // Code injection
    // Scrape website's html code from current tab
    const code = await this.getContentPage();
    console.log('Scraping content page from Popup componentDidMount()', code);
  }

  // get content page's html code via content page injection
  getContentPage = () => {
    return new Promise(async (resolve, reject) => {
      if (this.state.tab) {
        // we have to convert the function to a string
        const scriptToExec = `(${this.scrapePage})()`;

        // run the script in the context of the tab
        browser.tabs
          .executeScript(this.state.tab.id, { code: scriptToExec })
          .then((scrapedHtml) => {
            if (scrapedHtml) resolve(scrapedHtml[0]);
            else reject(`Could not scrape content page`);
          })
          .catch((e) => console.log(`Can not execute script: ${e.message}`));
      } else reject('Can not get content page of undefined tab');
    });
  };

  // return entire document's html code
  scrapePage = () => {
    return document.documentElement.outerHTML; // return html code
  };

  // example with class method to show state data
  getStateData = () => {
    return this.state.data;
  };

  render() {
    return (
      <div className='Popup' style={{ width: 600 }}>
        <ReactLogo width='40px' height='40px' />
        <h3>{this.getStateData()}</h3>
        <p>Below shows the project build output</p>
        <p>
          <img src={distPng} />
        </p>
      </div>
    );
  }
}

export default Popup;
