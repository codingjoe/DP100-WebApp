# DP100 WebApp

![screenshot](screenshot-UI-graph.png)

A browser interface for the DP100 digital power supply by Alientek.

## Features

- Connect to the DP100 using your browser (no installation required).
- Histogram of the voltage and current levels.

## Usage

You don't need to install anything to use this webapp.
Just visit [this link](https://johannes.maron.family/DP100-WebApp/) and you're good to go.

## Development

This project is based on the [WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) API.
It is a work-in-progress and not feature-complete. The Modbus implementation has been reverse-engineered
from the Windows library (`ATK-DP100DLL(x64)_2.0.dll`), which can be found as part of the official software.

If you want to contribute to this project, you can clone this repository and open the `index.html` file in your browser.

## Credits

Special thanks for [@scottbez1](https://github.com/scottbez1) for inspiring this project and being an overall camp.
