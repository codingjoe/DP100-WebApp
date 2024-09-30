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
 * class MyPSU extends DP100 {
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
 */
export class DP100 {

  /** The connected DP100 device. */
  device = null

  /** Connect to the DP100 device. */
  async connect () {
    [this.device] = await navigator.hid.requestDevice({
      filters: [{ vendorId, productId }]
    })
    await this.device.open()
    this.device.addEventListener('inputreport', this.inputReportHandler.bind(this))
    setInterval(
      () => this.sendReport(FUNCTIONS.BASIC_INFO), 10
    )
  }

  /**
   * Send a report to the DP100.
   *
   * @param {Number} functionId -- The function to call on the DP100.
   * @param {Uint8Array} content -- The data to send to the DP100.
   * @returns {Promise<void>} -- A promise that resolves when the report is sent.
   */
  async sendReport (functionId, content = null) {
    content = content || new Uint8Array(0)
    const report = new Uint8Array([
      deviceAddr,
      functionId,
      content.length,
      content,
      0, // checksum
      0  // checksum
    ])
    const reportView = new DataView(report.buffer, report.byteOffset, report.byteLength)
    const checksum = crc16(report.buffer.slice(0, report.length - 2))
    reportView.setUint16(report.length - 2, checksum, true)
    console.debug('device.sendReport', reportView)
    return await this.device.sendReport(0, report)
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
        expected: computedChecksum.toString(16),
        received: checksum.toString(16)
      })
      return
    }
    console.debug('content', contentView)

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
      default:
        console.warn('Unhandled function', header.functionType)
    }
  }

  /** Handle basic info from the DP100
   * @param {Object} basicInfo
   * @param {Number} basicInfo.vIn - Input voltage in mV.
   * @param {Number} basicInfo.vOut - Output voltage in mV.
   * @param {Number} basicInfo.iOut - Output current in mA.
   * @param {Number} basicInfo.voMax - Max output voltage in mV.
   * @param {Number} basicInfo.temp1 - Temperature 1 in 0.1°C.
   * @param {Number} basicInfo.temp2 - Temperature 2 in 0.1°C.
   * @param {Number} basicInfo.dc5V - 5V rail in mV.
   * @param {Number} basicInfo.outMode - Output mode.
   * @param {Number} basicInfo.workSt - Work state.
   */
  receiveBasicInfo ({ vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }) {
    const BasicInfoEvent = new CustomEvent('basicInfo', {
      detail: { vIn, vOut, iOut, voMax, temp1, temp2, dc5V, outMode, workSt }
    })
    document.dispatchEvent(BasicInfoEvent)
  }
}