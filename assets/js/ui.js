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
      value: (self, rawValue) => rawValue === null ? 'N/A' : `${rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 })}V`,
      scale: 'V',
      stroke: '#facc15',
      width: 2,
    }, {
      show: true,
      spanGaps: true,
      label: 'Current',
      value: (self, rawValue) => rawValue === null ? 'N/A' : `${rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 })}A`,
      scale: 'A',
      stroke: '#22c55e',
      width: 2,
    }, {
      show: true,
      spanGaps: true,
      label: 'Power',
      value: (self, rawValue) => rawValue === null ? 'N/A' : `${rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 })}W`,
      scale: 'W',
      fill: 'rgba(168, 85, 247, 0.1)',
      stroke: '#a855f7',
      width: 1,
    }
  ],
  axes: [
    {
      show: false
    },
    {
      scale: 'V',
      label: 'Voltage (V)',
      value: (self, rawValue) => rawValue === null ? 'N/A' : `${rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 })}V`,
      grid: { show: false },
      stroke: () => dark ? '#94a3b8' : '#64748b',
      ticks: {
        stroke: () => dark ? '#94a3b8' : '#64748b',
      },
    },
    {
      scale: 'A',
      label: 'Current (A)',
      value: (self, rawValue) => rawValue === null ? 'N/A' : `${rawValue.toLocaleString(undefined, { minimumFractionDigits: 3 })}A`,
      side: 1,
      grid: { show: false },
      stroke: () => dark ? '#94a3b8' : '#64748b',
      ticks: {
        stroke: () => dark ? '#94a3b8' : '#64748b',
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
      grid-template-areas:
        "graph vOut"
        "graph iOut"
        "graph pOut"
        "controls controls";
      grid-template-columns: 1fr 420px;
      grid-template-rows: 1fr 1fr 1fr auto;
      gap: 1rem;
      padding: 1rem;
      height: 100vh;
      box-sizing: border-box;
      background: radial-gradient(circle at top left, light-dark(#ffffff, #1e293b), light-dark(#f1f5f9, #0f172a));
    }

    .card {
      background: light-dark(rgba(255, 255, 255, 0.7), rgba(30, 41, 59, 0.7));
      backdrop-filter: blur(10px);
      border: 1px solid light-dark(rgba(203, 213, 225, 0.5), rgba(71, 85, 105, 0.5));
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .card:hover {
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    }

    #graph-container {
      grid-area: graph;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    #graph {
      flex: 1;
      width: 100%;
      height: 100%;
    }

    #vOut { grid-area: vOut; border-left: 6px solid #facc15; }
    #iOut { grid-area: iOut; border-left: 6px solid #22c55e; }
    #pOut { grid-area: pOut; border-left: 6px solid #a855f7; }

    .label {
      font-size: 0.8rem;
      font-weight: 700;
      color: light-dark(#64748b, #94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    .main-value {
      font-family: var(--font-mono);
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1;
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-top: auto;
      margin-bottom: auto;
    }

    .unit {
      font-size: 1.5rem;
      font-weight: 400;
      color: light-dark(#64748b, #94a3b8);
    }

    .secondary-values {
      display: flex;
      flex-direction: column;
      //gap: 0.4rem;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: light-dark(#64748b, #94a3b8);
      font-family: var(--font-mono);
      line-height: 1;
    }

    sub {
      font-size: 0.7em;
      vertical-align: sub;
      line-height: 0;
    }

    .secondary-values span:not(.label) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5em;
    }

    .secondary-values .value {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: light-dark(#1e293b, #f1f5f9);
    }

    .secondary-values strong {
      color: light-dark(#1e293b, #f1f5f9);
    }

    .set-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    input[type=range] {
      flex: 1;
      accent-color: currentColor;
    }

    input[type=number] {
      background: light-dark(rgba(241, 245, 249, 0.8), rgba(15, 23, 42, 0.8));
      border: 1px solid light-dark(#cbd5e1, #334155);
      border-radius: 0.375rem;
      padding: 0.25rem 0.5rem;
      font-family: var(--font-mono);
      font-size: 1rem;
      color: inherit;
      width: 5rem;
    }

    input:invalid {
      border-color: #ef4444;
      outline: none;
    }

    #controls {
      grid-area: controls;
      display: flex;
      gap: 1rem;
      align-items: stretch;
      padding-top: 0.5rem;
    }

    .control-card {
      background: light-dark(rgba(255, 255, 255, 0.5), rgba(30, 41, 59, 0.5));
      backdrop-filter: blur(10px);
      border: 1px solid light-dark(rgba(203, 213, 225, 0.3), rgba(71, 85, 105, 0.3));
      border-radius: 1rem;
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    #mode { flex: 0 0 220px; padding: 0; border: none; background: none; backdrop-filter: none; }

    #opp { flex: 1; }
    #vInMax { flex: 1; }
    #info { flex: 1; }
    #reset { flex: 1; }

    button {
      cursor: pointer;
      border: none;
      border-radius: 1rem;
      font-weight: 700;
      font-size: 1.25rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 2rem;
      height: 100%;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      width: 100%;
    }

    button:active {
      transform: scale(0.98);
    }

    #mode button {
      padding: 0.5rem;
    }

    .mode-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .mode-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .power-icon {
      width: 1.25rem;
      height: 1.25rem;
    }

    .mode-type {
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      filter: grayscale(1);
    }

    .btn-primary { background-color: #3b82f6; color: white; }
    .btn-primary:hover { background-color: #2563eb; box-shadow: 0 0 15px rgba(59, 130, 246, 0.5); }

    .btn-success { background-color: #22c55e; color: white; }
    .btn-success:hover { box-shadow: 0 0 15px rgba(34, 197, 94, 0.5); }

    .btn-warning { background-color: #eab308; color: white; }
    .btn-warning:hover { box-shadow: 0 0 15px rgba(234, 179, 8, 0.5); }

    .btn-danger { background-color: #ef4444; color: white; }
    .btn-danger:hover { box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }

    .btn-secondary { background-color: light-dark(#e2e8f0, #334155); color: inherit; }
    .btn-secondary:hover { background-color: light-dark(#cbd5e1, #475569); }

    /* uPlot Legend Styling */
    .u-legend {
      display: flex !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      justify-content: center !important;
      gap: 1.5rem !important;
      padding-top: 0.5rem !important;
      color: light-dark(#64748b, #94a3b8) !important;
    }

    .u-legend .u-marker {
      border-width: 2px !important;
      border-style: solid !important;
    }

    .u-legend .u-label {
      margin-right: 0.25rem !important;
    }

    .u-legend .u-value {
      font-family: var(--font-mono) !important;
      font-weight: 700 !important;
      margin-left: 0.25rem !important;
    }
  `

  constructor () {
    super()
    this.vMax = 0
    this.iMax = 0
    this.pMax = 0
    this.energy = 0
    this.timer = Date.now()
  }

  render () {
    return html`
      <link href="https://cdn.jsdelivr.net/npm/uplot@1.6.31/dist/uPlot.min.css" rel="stylesheet">
      <div id="graph-container" class="card">
        <div class="label">Real-time Telemetry</div>
        <div id="graph"></div>
      </div>

      <div id="vOut" class="card">
        <div class="label">Voltage Output</div>
        <div class="set-controls" style="color: #facc15">
          <input type="range" name="vo_set" @input=${this.changeVoltage.bind(this)}
                 .value=${this.settings?.vo_set} min="0"
                 max="${this.info?.voMax}" step="0.1">
          <input type="number" name="vo_set" @change=${this.changeVoltage.bind(this)}
                 .value=${this.settings?.vo_set} min="0"
                 max="${this.info?.voMax}" step="0.001">
        </div>
        <div class="main-value">
          ${this.info?.vOut.toLocaleString(undefined, {
            minimumFractionDigits: 3,
            minimumIntegerDigits: 2,
            useGrouping: false
          })}
          <span class="unit">V</span>
        </div>
        <div class="secondary-values">
          <span>SET: <strong>${this.settings?.vo_set.toLocaleString(undefined, { minimumFractionDigits: 3 })}V</strong></span>
          <span>MAX: <strong>${(this.vMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}V</strong></span>
        </div>
      </div>

      <div id="iOut" class="card">
        <div class="label">Current Output</div>
        <div class="set-controls" style="color: #22c55e">
          <input type="range" @input="${this.changeCurrent.bind(this)}"
                 .value=${this.settings?.io_set} min="0"
                 max="5" step="0.1">
          <input type="number" @change=${this.changeCurrent.bind(this)}
                 .value=${this.settings?.io_set} min="0"
                 max="5" step="0.001">
        </div>
        <div class="main-value">
          ${this.info?.iOut.toLocaleString(undefined, {
            minimumFractionDigits: 3,
            minimumIntegerDigits: 2,
            useGrouping: false
          })}
          <span class="unit">A</span>
        </div>
        <div class="secondary-values">
          <span>SET: <strong>${this.settings?.io_set.toLocaleString(undefined, { minimumFractionDigits: 3 })}A</strong></span>
          <span>MAX: <strong>${(this.iMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}A</strong></span>
        </div>
      </div>

      <div id="pOut" class="card">
        <div class="label">Power & Energy</div>
        <div class="set-controls" style="visibility: hidden">
          <input type="range">
        </div>
        <div class="main-value">
          ${(this.info?.iOut * this.info?.vOut).toLocaleString(undefined, {
            minimumFractionDigits: 3,
            minimumIntegerDigits: 2,
            useGrouping: false
          })}
          <span class="unit">W</span>
        </div>
        <div class="secondary-values">
          <span>MAX: <strong>${(this.pMax).toLocaleString(undefined, { minimumFractionDigits: 3 })}W</strong></span>
          <span>E: <strong>${(this.energy).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}Wh</strong></span>
        </div>
      </div>

      <div id="controls">
        <div id="mode">
          ${this.renderMode()}
        </div>
        <div id="opp" class="control-card">
          <div class="label">Protection Limits</div>
          <div class="secondary-values">
            <span>OVP: <span class="value"><input type="number" @change=${this.changeOverVoltageProtection.bind(this)}
                   .value=${this.settings?.ovp_set} min="0" max="30.5" step="0.01"> <strong>V</strong></span></span>
            <span>OCP: <span class="value"><input type="number" @change=${this.changeOverCurrentProtection.bind(this)}
                   .value=${this.settings?.ocp_set} min="0" max="5.05" step="0.001"> <strong>A</strong></span></span>
          </div>
        </div>
        <div id="vInMax" class="control-card">
          <div class="label">Input Status</div>
          <div class="secondary-values">
            <span><span class="label">V<sub>in</sub>:</span> <strong>${this.info?.vIn.toLocaleString(undefined, { minimumFractionDigits: 3 })}V</strong></span>
            <span><span class="label">V<sub>max</sub>:</span> <strong>${this.info?.voMax.toLocaleString(undefined, { minimumFractionDigits: 3 })}V</strong></span>
          </div>
        </div>
        <div id="info" class="control-card">
          <div class="label">System Temp</div>
          <div class="secondary-values">
            <span>T1: <strong>${this.info?.temp1.toLocaleString(undefined, { minimumFractionDigits: 1 })}°C</strong></span>
            <span>T2: <strong>${this.info?.temp2.toLocaleString(undefined, { minimumFractionDigits: 1 })}°C</strong></span>
          </div>
        </div>
        <div id="reset" class="control-card">
          <div class="label">Statistics</div>
          <button class="btn-secondary" style="padding: 0.5rem; font-size: 1rem;" @click=${this.reset.bind(this)}>RESET STATS</button>
        </div>
      </div>
    `
  }

  renderMode () {
    if (!this.device) {
      return html`
        <button class="btn-primary" @click="${this.connect.bind(this)}">CONNECT DEVICE</button>`
    }

    const isOn = !!this.settings?.state
    let modeLabel = 'OFF'
    let btnClass = 'btn-secondary'

    if (isOn) {
      switch (this.info?.outMode) {
        case 0:
          modeLabel = 'CC'
          btnClass = 'btn-success'
          break
        case 1:
          modeLabel = 'CV'
          btnClass = 'btn-warning'
          break
        case 2:
          btnClass = 'btn-danger'
          switch (this.info?.workSt) {
            case 1: modeLabel = 'OVP'; break
            case 2: modeLabel = 'OCP'; break
            default: modeLabel = 'PROT'; break
          }
          break
      }
    }

    return html`
      <button class="${btnClass}" @click="${this.togglePower.bind(this)}">
        <div class="mode-content">
          <div class="mode-status">
            <svg class="power-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
            <span>OUTPUT ${isOn ? 'ON' : 'OFF'}</span>
          </div>
          <div class="mode-type">${modeLabel}</div>
        </div>
      </button>`
  }

  updated (changedProperties) {
    this.shadowRoot.querySelectorAll('input').forEach(input => {
      input.disabled = !this.device
    })
    if (changedProperties.has('settings') && this.graph && this.settings) {
      const ovp = parseFloat(this.settings.ovp_set) || 30
      const ocp = parseFloat(this.settings.ocp_set) || 5
      this.graph.setScale('V', { min: 0, max: ovp })
      this.graph.setScale('A', { min: 0, max: ocp })
      this.graph.setScale('W', { min: 0, max: ovp * ocp })
    }
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

  reset () {
    this.energy = 0
    this.timer = Date.now()
    this.vMax = 0
    this.iMax = 0
    this.pMax = 0
  }

  firstUpdated () {
    const graphElement = this.shadowRoot.querySelector('#graph')
    this.graph = new uplot({
      ...grapOptions,
      width: graphElement.offsetWidth,
      height: graphElement.offsetHeight - 48,
    }, [this.tHistory, this.vHistory, this.iHistory, this.pHistory], graphElement)

    new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.graph.setSize({ width, height: height - 48 })
      }
    }).observe(graphElement)
  }

  receiveBasicInfo ({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }) {
    super.receiveBasicInfo({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt })

    this.vMax = vOut > this.vMax ? vOut : this.vMax
    this.iMax = iOut > this.iMax ? iOut : this.iMax
    this.pMax = vOut * iOut > this.pMax ? vOut * iOut : this.pMax
    this.energy += vOut * iOut * (Date.now() - this.timer) / 1000 / 3600
    this.timer = Date.now()

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
