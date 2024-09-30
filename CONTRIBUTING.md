# Contributing

Welcome to the DP100 WebApp project! We are happy that you are interested in contributing to this project.

## Architecture

### WebHID

This project is based on the [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) API.
It enables you to connect to Bluetooth or USB, like our power supply, via the browser.

### Javascript & ESM

Since we already rely on a browser environment,
we use the [ESM](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) module system.
All code is written in vanilla Javascript.

### Dependencies

We use [μPlot](https://github.com/leeoniya/uPlot) for the graphing because it is lightweight and fast.
Everything else is build via Web Components with the help of [Lit](https://lit.dev/).

## Development

This project is based on the [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) API.
It is a work-in-progress and not feature-complete. The Modbus implementation has been reverse-engineered
from the Windows library (`ATK-DP100DLL(x64)_2.0.dll`), which can be found as part of the official software.

If you want to contribute to this project, you can clone this repository and open the `index.html` file in your browser.

You will need to enable write mode on Linux, since most distributions default to read-only.
You can find this and other useful tips in the [Chrome Dev Tips][dev-tips].

[dev-tips]: https://developer.chrome.com/docs/capabilities/hid#dev-tips