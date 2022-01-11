const { MigrationPayload } = require('../proto/oauthMigration')
const IN_DIR = process.env.IN_DIR || 'inputs'
const OUT_DIR = process.env.OUT_DIR || 'outputs'
const OUT_TEXT_DIR = process.env.OUT_TEXT_DIR || 'outputs-text'
const fs = require('fs').promises
const qrcode = require('qrcode')
const jsqr = require('jsqr')
const path = require('path')
const sharp = require('sharp')
const crypto = require('crypto')
const b32 = require('hi-base32')
async function main () {
  await fs.mkdir(IN_DIR, { recursive: true })
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.mkdir(OUT_TEXT_DIR, { recursive: true })
  const files = await fs.readdir(IN_DIR)
  for (const file of files) {
    const p = path.join(IN_DIR, file)
    let url
    try {
      const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const { width, height } = info
      const bc = new Uint8ClampedArray(data.buffer)
      // console.log(info)
      url = jsqr(bc, width, height)
    } catch (ex) {
      console.error(`Error on parsing ${p}:`, ex)
      continue
    }
    const data = new URL(url.data).searchParams.get('data')
    const decoded = MigrationPayload.decode(Buffer.from(data, 'base64'))
    const params = decoded.otpParameters
    const filterFunc = e => e.issuer === 'ONE Wallet' || e.issuer === 'Harmony' || e.issuer === '1wallet'
    const filteredParams = params.filter(filterFunc)
    for (const param of params) {
      console.log(`${filterFunc(param) ? '[ACCEPTED]' : '[SKIPPED] (Not 1wallet)'} Detected [${param.issuer} (${param.name})] - secret hash: ${crypto.createHash('sha256').update(param.secret).digest('hex')}`)
    }
    if (filteredParams.length === 0) {
      console.log(`Skipping ${p}: no 1wallet QR code found in all ${params.length} accounts`)
      continue
    }
    console.log(`[${filteredParams.length}] 1wallet QR code found out of ${params.length} accounts in ${p})`)

    const outFilenames = filteredParams.map(e => e.name.split(' -')[0].trim())
      .map(e => e.split('(')[0].trim())
      .map(e => e.replace(/ /g, '-').toLowerCase())
    for (const [ind, param] of filteredParams.entries()) {
      const oFilename = outFilenames[ind] + '-' + crypto.createHash('sha256').update(param.secret).digest('hex') + '.png'
      const otFilename = outFilenames[ind] + '-' + crypto.createHash('sha256').update(param.secret).digest('hex') + '.txt'
      const op = path.join(OUT_DIR, oFilename)
      const otp = path.join(OUT_TEXT_DIR, otFilename)
      const payload = MigrationPayload.create({
        otpParameters: [{
          issuer: 'Harmony',
          secret: param.secret,
          name: param.name,
          algorithm: MigrationPayload.Algorithm.ALGORITHM_SHA1,
          digits: MigrationPayload.DigitCount.DIGIT_COUNT_SIX,
          type: MigrationPayload.OtpType.OTP_TYPE_TOTP,
        }],
        version: 1,
        batchIndex: 0,
        batchSize: 1,
      })
      const bytes = MigrationPayload.encode(payload).finish()
      const b64 = Buffer.from(bytes).toString('base64')
      const uri = `otpauth-migration://offline?data=${encodeURIComponent(b64)}`
      try {
        await fs.writeFile(otp, JSON.stringify({ issuer: param.issuer, name: param.name, secret: b32.encode(param.secret) }), { encoding: 'utf-8' })
        const dataUrl = await qrcode.toDataURL(uri, { errorCorrectionLevel: 'low', width: 256 })
        const b = Buffer.from(dataUrl.split(',')[1], 'base64')
        await sharp(b).png().toFile(op)
        console.log('Wrote QR code to', op)
        console.log('Wrote plaintext (with b32 encoded secret) to', op)
      } catch (ex) {
        console.error('Failed to write QR code for', op)
        console.error(ex)
      }
    }
  }
}

main()
