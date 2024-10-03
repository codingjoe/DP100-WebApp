import uplot from 'uplot'
import { LitElement, html, css } from 'lit'
import { DP100 } from './dp100.js'

const dark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches

const grapOptions = {
  id: 'uv-graph',
  series: [
    {
      label: 'Time',
      value: (self, rawValue) => rawValue === null ? '   N/A' : new Date(rawValue * 1000).toLocaleTimeString(),
    },
    {
      show: true,
      spanGaps: true,
      label: 'Voltage',
      value: (self, rawValue) => rawValue === null ? 'N/A' : rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 }) + 'V',
      scale: 'V',
      stroke: 'rgb(250, 200, 0)',
      width: 2,
    }, {
      show: true,
      spanGaps: true,
      label: 'Current',
      value: (self, rawValue) => rawValue === null ? 'N/A' : rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 }) + 'A',
      scale: 'A',
      stroke: 'green',
      width: 2,
    }, {
      show: true,
      spanGaps: true,
      label: 'Power',
      value: (self, rawValue) => rawValue === null ? 'N/A' : rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 }) + 'W',
      scale: 'W',
      fill: 'rgba(200, 0, 200, 0.3)',
      width: 0,
    }
  ],
  axes: [
    {
      show: false
    },
    {
      scale: 'V',
      label: 'Voltage (V)',
      value: (self, rawValue) => rawValue === null ? 'N/A' : rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 }) + 'V',
      grid: { show: false },
      stroke: () => dark ? 'white' : 'black',
      ticks: {
        stroke: () => dark ? 'white' : 'black',
      },
    },
    {
      scale: 'A',
      label: 'Current (A)',
      value: (self, rawValue) => rawValue === null ? 'N/A' : rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 }) + 'A',
      side: 1,
      grid: { show: false },
      stroke: () => dark ? 'white' : 'black',
      ticks: {
        stroke: () => dark ? 'white' : 'black',
      },
    },
    {},
  ],
  scales: {
    'x': {},
    'V': {
      auto: false,
      range: [0, 30],
    },
    'A': {
      auto: false,
      range: [0, 5],
    },
    'W': {
      auto: false,
      range: [0, 100],
    }
  },
}

export class DP100Element extends DP100(LitElement) {
  tHistory = []
  vHistory = []
  iHistory = []
  wHistory = []

  static properties = {
    device: { type: Object, attribute: false, reflect: true },
    settings: { type: Object, attribute: false, reflect: true },
    info: { type: Object, attribute: false, reflect: true }
  }
  static styles = css`
    :host {
      display: grid;
      grid-template:
        "graph graph graph vOut" 2fr
        "graph graph graph iOut" 2fr
        "graph graph graph pOut" 1fr
        "mode opp vInMax info" 120px / 1fr 1fr 1fr 360px;
      height: 100vh;
    }

    * {
      font-family: monospace;
    }

    .group {
      display: grid;
      grid-template:
        "label value-1"
        "label value-2" / min-content auto;
      gap: 1rem;
      padding: 1rem;

      .label {
        grid-area: label;
        font-weight: bold;
        font-size: 5em;
        margin: auto 0;
      }

      .value-1, .value-2 {
        grid-area: auto;
        font-size: 2em;
      }

      .value-1 {
        margin: auto 0 0;
      }

      .value-2 {
        margin: 0 0 auto;
      }
    }

    #graph {
      grid-area: graph;
      border: thick solid CanvasText;
    }

    #vOut {
      grid-area: vOut;
      background-color: rgb(250 200 0 / 30%);
      border: thick solid rgb(250 200 0 / 100%);
      font-size: 2em;
    }

    #iOut {
      grid-area: iOut;
      background-color: rgb(0 200 0 / 30%);
      border: thick solid rgb(0 200 0 / 100%);
      font-size: 2em;
    }

    #pOut {
      grid-area: pOut;
      background-color: rgb(200 0 200 / 30%);
      border: thick solid rgb(200 0 200 / 100%);
      font-size: 2em;
    }

    #mode {
      grid-area: mode;
    }

    #opp {
      grid-area: opp;
    }

    #vInMax {
      grid-area: vInMax;
    }

    #info {
      grid-area: info;
    }


    input:invalid {
      border: medium dashed red;
    }

    input[type=number] {
      border: 0;
      background: none;
      font-size: 1em;
      max-width: 4em;
      font-family: monospace;
    }

    button {
      font-size: 5em;
      font-weight: bold;
      width: 100%;
      height: 100%;
      border: none;
      background-color: #efefef;
      color: black
    }
  `

  render () {
    return html`
      <link href="https://cdn.jsdelivr.net/npm/uplot@1.6.31/dist/uPlot.min.css" rel="stylesheet">
      <div id="graph"></div>
      <div id="vOut" class="group">
        <div class="label">
          V
        </div>
        <div class="value-1">
          <input type="number" name="vo_set" @change=${this.changeVoltage.bind(this)}
                 .value=${this.settings?.vo_set} min="0"
                 max="${this.info?.voMax}" step="0.001">
        </div>
        <div class="value-2">
          <input type="range" name="vo_set" @input=${this.changeVoltage.bind(this)}
                 .value=${this.settings?.vo_set} min="0"
                 max="${this.info?.voMax}" step="0.1">
        </div>
      </div>
      <div id="iOut" class="group">
        <div class="label">
          A
        </div>
        <div class="value-1">
          <input type="number" @change=${this.changeCurrent.bind(this)}
                 .value=${this.settings?.io_set} min="0"
                 max="5" step="0.001">
        </div>
        <div class="value-2">
          <input type="range" @input="${this.changeCurrent.bind(this)}"
                 .value=${this.settings?.io_set} min="0"
                 max="5" step="0.1">
        </div>
      </div>
      <div id="pOut" class="group">
        <div class="label">
          W
        </div>
        <div class="value-1">
        </div>
        <div class="value-2">
          ${(this.info?.iOut * this.info?.vOut).toLocaleString(undefined, { minimumFractionDigits: 3 })}
        </div>
      </div>
      <div id="mode">
        ${this.renderMode()}
      </div>
      <div id="opp" class="group">
        <div class="label">OPP</div>
        <div class="value-1">
          OVP
          <input type="number" @change="${this.changeOverVoltageProtection.bind(this)}"
                 .value=${this.settings?.ovp_set} min="0" max="30" step="0.01">V
        </div>
        <div class="value-2">
          OCP
          <input type="number" @change="${this.changeOverCurrentProtection.bind(this)}"
                 .value=${this.settings?.ocp_set} min="0" max="5" step="0.001">A
        </div>
      </div>
      <div id="vInMax" class="group">
        <div class="label">V</div>
        <div class="value-1">In ${this.info?.vIn.toLocaleString(undefined, { minimumFractionDigits: 3 })}&numsp;V</div>
        <div class="value-2">Out ${this.info?.voMax.toLocaleString(undefined, { minimumFractionDigits: 3 })}&numsp;V
        </div>
      </div>
      <div id="info" class="group">
        <div class="label">T</div>
        <div class="value-1">T<sub>1</sub> ${this.info?.temp1.toLocaleString(undefined, { minimumFractionDigits: 1 })}&numsp;°C
        </div>
        <div class="value-2">T<sub>2</sub> ${this.info?.temp2.toLocaleString(undefined, { minimumFractionDigits: 1 })}&numsp;°C
        </div>
      </div>
    `
  }

  renderMode () {
    if (!this.device) {
      return html`
        <button @click="${this.connect.bind(this)}">Connect</button>`
    }
    if (!this.settings?.state) {
      return html`
        <button @click="${this.togglePower.bind(this)}">OFF</button>`
    }
    switch (this.info?.outMode) {
      case 0:
        return html`
          <button @click="${this.togglePower.bind(this)}" style="background-color: rgb(0 200 0 / 85%)">CC</button>`
      case 1:
        return html`
          <button @click="${this.togglePower.bind(this)}" style="background-color: rgb(250 200 0 / 85%)">CV</button>`
      case 2:
        switch (this.info?.workSt) {
          case 1:
            return html`
              <button @click="${this.togglePower.bind(this)}" style="background-color: rgb(200 0 0 / 85%)">OVP</button>`
          case 2:
            return html`
              <button @click="${this.togglePower.bind(this)}" style="background-color: rgb(200 0 0 / 85%)">OCP</button>`
        }
    }
  }

  updated () {
    this.shadowRoot.querySelectorAll('input').forEach(input => {
      input.disabled = !this.device
    })
  }

  togglePower () {
    this.setBasicSettings({ state: this.settings.state ? 0 : 1 })
  }

  changeVoltage (event) {
    this.setBasicSettings({ vo_set: event.target.value })
  }

  changeCurrent (event) {
    this.setBasicSettings({ io_set: event.target.value })
  }

  changeOverVoltageProtection (event) {
    this.setBasicSettings({ ovp_set: event.target.value })
  }

  changeOverCurrentProtection (event) {
    this.setBasicSettings({ ocp_set: event.target.value  })
  }

  firstUpdated () {
    const graphElement = this.shadowRoot.querySelector('#graph')
    this.graph = new uplot({
      ...grapOptions,
      width: graphElement.offsetWidth,
      height: graphElement.offsetHeight - 48,
    }, [this.tHistory, this.vHistory, this.iHistory, this.wHistory], graphElement)
  }

  receiveBasicInfo ({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }) {
    super.receiveBasicInfo({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt })

    this.tHistory.push(Date.now() / 1000)  // uplot uses seconds
    this.vHistory.push(vOut)
    this.iHistory.push(iOut)
    this.wHistory.push(vOut * iOut)
    if (this.vHistory.length > 360) {
      this.tHistory.shift()
      this.vHistory.shift()
      this.iHistory.shift()
      this.wHistory.shift()
    }
    this.graph.setData([this.tHistory, this.vHistory, this.iHistory, this.wHistory])
  }
}

customElements.define('dp100-element', DP100Element)