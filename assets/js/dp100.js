const vendorId = 11836, productId = 44801  // DP100's HID IDs
const deviceAddr = 251  // DP100's device address

/**
 * Calculate the buffers CRC-16/MODBUS checksum.
 *
 * @param {ArrayBuffer} buffer - The buffer to calculate the CRC16 for.
 * @returns {Number} - The CRC16 checksum.
 */
export function crc16 (buffer) {
  let crc = 0xFFFF

  for (const byte of new Uint8Array(buffer)) {
    crc = crc ^ byte

    for (let j = 0; j < 8; j++) {
      const odd = crc & 0x0001
      crc = crc >> 1
      if (odd) {
        crc = crc ^ 0xA001
      }
    }
  }

  return crc
}

/** DP100 Modbus Function IDs */
const FUNCTIONS = Object.freeze({
  DEVICE_INFO: 0x10,
  FIRM_INFO: 17,
  START_TRANS: 18,
  DATA_TRANS: 19,
  END_TRANS: 20,
  DEV_UPGRADE: 21,
  BASIC_INFO: 48,
  BASIC_SET: 53,
  SYSTEM_INFO: 0x40,
  SYSTEM_SET: 69,
  SCAN_OUT: 80,
  SERIAL_OUT: 85,
  DISCONNECT: 0x80,
  NONE: 0xFF,
})

/** DP100 device class.
 *
 * This class is used to interact with the DP100 power supply.
 * @example
 *
 * class MyPSU extends DP100() {
 *   receiveBasicInfo ({vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt}) {
 *     console.info('Input Voltage:', vIn, 'V')
 *     console.info('Output Voltage:', vOut, 'V')
 *     console.info('Output Current:', iOut, 'A')
 *     console.info('Max Output Voltage:', voMax, 'V')
 *     console.info('Temperature 1:', temp1, '°C')
 *     console.info('Temperature 2:', temp2, '°C')
 *     console.info('DC 5V:', dc5V, 'V')
 *     console.info('Output Mode:', outMode)
 *     console.info('Work State:', workSt)
 *   }
 * }
 *
 * const psu = new MyPSU()
 * await psu.connect()
 *
 * @param {*} Base - The base class to extend.
 * @mixin
 * @returns {Base} The new class.
 */
export function DP100 (Base) {
  return class extends Base {

    settingsQueue = []
    refreshRate = 10  // 10ms (100Hz)

    /** Connect to the DP100 device. */
    async connect () {
      [this.device] = await navigator.hid.requestDevice({
        filters: [{ vendorId, productId }]
      })
      await this.device.open()
      this.device.addEventListener('inputreport', this.inputReportHandler.bind(this))
      this.device.addEventListener('disconnect', () => {
        console.warn('Device disconnected')
        this.device = null
        clearInterval(this.updateLoop)
      })
      this.getBasicSettings().then(() => {
        this.updateLoop = setInterval(() => {
          this.sendReport(FUNCTIONS.BASIC_INFO)
        }, this.refreshRate)
      })
    }

    /**
     * Send a report to the DP100.
     *
     * @param {Number} functionId -- The function to call on the DP100.
     * @param {Uint8Array} content -- The data to send to the DP100.
     * @param {Number} sequence -- The sequence number for the report.
     * @returns {Promise<void>} -- A promise that resolves when the report is sent.
     */
    async sendReport (functionId, content = null, sequence = null) {
      content = content || new Uint8Array([0])
      const header = [deviceAddr, functionId, sequence, // sequence, unused if there is no content
        content.length, ...content, 0, // checksum
        0  // checksum
      ]
      if (sequence === null) {
        header.splice(2, 1)
      }
      const report = new Uint8Array(header)
      const reportView = new DataView(report.buffer, report.byteOffset, report.byteLength)
      const checksum = crc16(report.buffer.slice(0, report.length - 2))
      reportView.setUint16(report.length - 2, checksum, true)
      console.debug('device.sendReport', reportView)
      return await this.device.sendReport(0, report)
    }

    async getBasicSettings () {
      await this.sendReport(FUNCTIONS.BASIC_SET, new Uint8Array([0 | 0x80]), 0)
    }

    async setBasicSettings ({ state, vo_set, io_set, ovp_set, ocp_set }) {
      if (this.settings === undefined) {
        throw new Error('Settings not loaded')
      }
      console.info('setBasicSettings', { state, vo_set, io_set, ovp_set, ocp_set })
      const basicSet = Object.assign({}, this.settings, Object.fromEntries(Object.entries({
        state, vo_set, io_set, ovp_set, ocp_set
      }).filter(([k, v]) => v !== undefined)))
      const index = this.settingsQueue.length
      this.settingsQueue[index] = basicSet
      const out = new Uint8Array(10)
      const outDv = new DataView(out.buffer, out.byteOffset, out.length)
      outDv.setUint8(0, index | 0x20)
      outDv.setUint8(1, basicSet.state)
      outDv.setUint16(2, basicSet.vo_set * 1000, true)
      outDv.setUint16(4, basicSet.io_set * 1000, true)
      outDv.setUint16(6, basicSet.ovp_set * 1000, true)
      outDv.setUint16(8, basicSet.ocp_set * 1000, true)
      await this.sendReport(FUNCTIONS.BASIC_SET, out, 0)
    }

    /** Handle input reports from the DP100
     * @param {HIDInputReportEvent} event
     */
    inputReportHandler (event) {
      console.debug('device.inputreport', event)
      const data = event.data
      const headerLength = 4
      const header = {
        deviceAddr: data.getUint8(0),
        functionType: event.data.getUint8(1),
        sequence: event.data.getUint8(2),
        contentLength: event.data.getUint8(3),
      }
      const contentView = new DataView(data.buffer.slice(headerLength, headerLength + header.contentLength))
      const checksum = data.getUint16(headerLength + header.contentLength, true)
      const computedChecksum = crc16(data.buffer.slice(0, headerLength + header.contentLength))
      if (computedChecksum !== checksum) {
        console.error('Checksum Failed', {
          expected: computedChecksum.toString(16), received: checksum.toString(16)
        })
        return
      }
      switch (header.functionType) {
        case FUNCTIONS.BASIC_INFO:
          this.receiveBasicInfo({
            vIn: contentView.getUint16(0, true) / 1000,
            vOut: contentView.getUint16(2, true) / 1000,
            iOut: contentView.getUint16(4, true) / 1000,
            voMax: contentView.getUint16(6, true) / 1000,
            temp1: contentView.getUint16(8, true) / 10,
            temp2: contentView.getUint16(10, true) / 10,
            dc5V: contentView.getUint16(12, true) / 1000,
            outMode: contentView.getUint8(14),
            workSt: contentView.getUint8(15)
          })
          break
        case FUNCTIONS.BASIC_SET:
          if (contentView.byteLength === 1) {
            this.settings = this.settingsQueue.pop(contentView.getUint8(0))
            break
          }
          this.receiveBasicSettings({
            index: contentView.getUint8(0),
            state: contentView.getUint8(1),
            vo_set: contentView.getUint16(2, true) / 1000,
            io_set: contentView.getUint16(4, true) / 1000,
            ovp_set: contentView.getUint16(6, true) / 1000,
            ocp_set: contentView.getUint16(8, true) / 1000,
          })
          break
        default:
          console.warn('Unhandled function', header.functionType)
      }
    }

    /** Handle basic info from the DP100
     * @param {Object} basicInfo
     * @param {Number} basicInfo.vIn - Input voltage in V.
     * @param {Number} basicInfo.vOut - Output voltage in V.
     * @param {Number} basicInfo.iOut - Output current in A.
     * @param {Number} basicInfo.voMax - Max output voltage in V.
     * @param {Number} basicInfo.temp1 - Temperature 1 in °C.
     * @param {Number} basicInfo.temp2 - Temperature 2 in °C.
     * @param {Number} basicInfo.dc5V - 5V rail in V.
     * @param {Number} basicInfo.outMode - Output mode.
     * @param {Number} basicInfo.workSt - Work state.
     */
    receiveBasicInfo ({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }) {
      console.debug('receiveBasicInfo', { vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt })
      this.info = { vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }
    }

    /** Handle basic settings from the DP100
     * @param {Object} basicSettings
     * @param {Number} basicSettings.index - Setting index.
     * @param {Number} basicSettings.state - Setting state.
     * @param {Number} basicSettings.vo_set - Output voltage setting in V.
     * @param {Number} basicSettings.io_set - Output current setting in A.
     * @param {Number} basicSettings.ovp_set - Over-voltage protection setting in V.
     * @param {Number} basicSettings.ocp_set - Over-current protection setting in A.
     */
    receiveBasicSettings ({ index, state, vo_set, io_set, ovp_set, ocp_set }) {
      console.info('receiveBasicSettings', { index, state, vo_set, io_set, ovp_set, ocp_set })
      this.settings = { state, vo_set, io_set, ovp_set, ocp_set }
    }
  }
}