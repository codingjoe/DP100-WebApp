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
  pHistory = []

  static properties = {
    device: { type: Object, attribute: false, reflect: true },
    settings: { type: Object, attribute: false, reflect: true },
    info: { type: Object, attribute: false, reflect: true },
    vMax: { type: Number, attribute: false, reflect: true },
    iMax: { type: Number, attribute: false, reflect: true },
    pMax: { type: Number, attribute: false, reflect: true },
  }
  static styles = css`
    :host {
      display: grid;
      grid-template:
        "graph graph graph vOut" 2fr
        "graph graph graph iOut" 2fr
        "graph graph graph pOut" 1fr
        "mode opp vInMax info" 120px / 1fr 1fr 1fr 380px;
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
      padding: 1rem;

      .label {
        grid-area: label;
        font-weight: bold;
        font-size: 4em;
        margin: auto 0;

        sub {
          font-size: 2rem;
        }
      }

      .value-1, .value-2 {
        grid-area: auto;
        font-size: 2em;
      }

      .value-1 {
        margin: 0.25em 0 0;

        input {
          max-width: 4em;
        }
      }

      .value-2 {
        margin: 0 0 auto;
      }
    }

    .group--big {
      grid-template:
      "label value-1"
      "value-2 value-2" / min-content auto;

      .value-2 {
        grid-column: 1 / 3;
        line-height: 0;

        input {
          width: 100%;
        }
      }
    }

    #graph {
      grid-area: graph;
      border: thick solid CanvasText;
    }

    #vOut, #iOut, #pOut {
      font-size: 2em;
      display: flex;
      flex-direction: column;
      justify-content: space-evenly;
    }

    #vOut {
      grid-area: vOut;
      background-color: rgb(250 200 0 / 30%);
      border: thick solid rgb(250 200 0 / 100%);
    }

    #iOut {
      grid-area: iOut;
      background-color: rgb(0 200 0 / 30%);
      border: thick solid rgb(0 200 0 / 100%);
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

  constructor () {
    super()
    this.vMax = 0
    this.iMax = 0
    this.pMax = 0
  }

  render () {
    return html`
      <link href="https://cdn.jsdelivr.net/npm/uplot@1.6.31/dist/uPlot.min.css" rel="stylesheet">
      <div id="graph"></div>
      <div id="vOut">
        <div class="group">
          <div class="label">
            V<sub>out</sub>
          </div>
          <div class="value-1">
            ${this.info?.vOut.toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
        <div class="group group--big">
          <div class="label">
            V<sub>set</sub>
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
        <div class="group">
          <div class="label">
            V<sub>max</sub>
          </div>
          <div class="value-1">
            ${(this.vMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
      </div>
      <div id="iOut">
        <div class="group">
          <div class="label">
            A<sub>out</sub>
          </div>
          <div class="value-1">
            ${this.info?.iOut.toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
        <div class="group group--big">
          <div class="label">
            A<sub>set</sub>
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
        <div class="group">
          <div class="label">
            A<sub>max</sub>
          </div>
          <div class="value-1">
            ${(this.iMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
      </div>
      <div id="pOut">
        <div class="group">
          <div class="label">
            W<sub>out</sub>
          </div>
          <div class="value-1">
            ${(this.info?.iOut * this.info?.vOut).toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
        <div class="group">
          <div class="label">
            W<sub>max</sub>
          </div>
          <div class="value-1">
            ${(this.pMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}
          </div>
          <div class="value-2">
          </div>
        </div>
      </div>
      <div id="mode">
        ${this.renderMode()}
      </div>
      <div id="opp" class="group">
        <div class="label">OPP</div>
        <div class="value-1">
          V
          <input type="number" @change=${this.changeOverVoltageProtection.bind(this)}
                 .value=${this.settings?.ovp_set} min="0"
                 max="30.5" step="0.01">
        </div>
        <div class="value-2">
          A
          <input type="number" @change=${this.changeOverCurrentProtection.bind(this)}
                 .value=${this.settings?.ocp_set} min="0"
                 max="5.05" step="0.001">
        </div>
      </div>
      <div id="vInMax" class="group">
        <div class="label">V</div>
        <div class="value-1">In
          ${this.info?.vIn.toLocaleString(undefined, { minimumFractionDigits: 3, minimumIntegerDigits: 2 })}&numsp;V
        </div>
        <div class="value-2">Out<sub>max</sub>
          ${this.info?.voMax.toLocaleString(undefined, { minimumFractionDigits: 3 })}&numsp;V
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
    this.setBasicOutput({ state: this.settings.state ? 0 : 1 })
  }

  changeVoltage (event) {
    this.setBasicOutput({ vo_set: event.target.value })
  }

  changeCurrent (event) {
    this.setBasicOutput({ io_set: event.target.value })
  }

  changeOverVoltageProtection (event) {
    this.setBasicSettings({ ovp_set: event.target.value })
  }

  changeOverCurrentProtection (event) {
    this.setBasicSettings({ ocp_set: event.target.value })
  }

  firstUpdated () {
    const graphElement = this.shadowRoot.querySelector('#graph')
    this.graph = new uplot({
      ...grapOptions,
      width: graphElement.offsetWidth,
      height: graphElement.offsetHeight - 48,
    }, [this.tHistory, this.vHistory, this.iHistory, this.pHistory], graphElement)
  }

  receiveBasicInfo ({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }) {
    super.receiveBasicInfo({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt })

    this.vMax = vOut > this.vMax ? vOut : this.vMax
    this.iMax = iOut > this.iMax ? iOut : this.iMax
    this.pMax = vOut * iOut > this.pMax ? vOut * iOut : this.pMax

    this.tHistory.push(Date.now() / 1000)  // uplot uses seconds
    this.vHistory.push(vOut)
    this.iHistory.push(iOut)
    this.pHistory.push(vOut * iOut)
    if (this.vHistory.length > 30 * 1000 / this.refreshRate) {
      this.tHistory.shift()
      this.vHistory.shift()
      this.iHistory.shift()
      this.pHistory.shift()
    }
    this.graph.setData([this.tHistory, this.vHistory, this.iHistory, this.pHistory])
  }
}

customElements.define('dp100-element', DP100Element)