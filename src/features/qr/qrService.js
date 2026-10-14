import QRCode from 'qrcode'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { getStore, saveStore } from '../../lib/mockStore'

/**
 * Safely trigger download of a Blob with preserved filename and extension
 * explicitly compatible with Chromium, Edge, and Windows shell integration.
 */
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  a.setAttribute('download', filename)

  // Edge and Chrome on Windows require the anchor to be part of the active DOM
  document.body.appendChild(a)

  try {
    a.click()
  } catch {
    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window
    })
    a.dispatchEvent(evt)
  }

  // Allow enough time for the browser download manager to bind the stream
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a)
    }
    URL.revokeObjectURL(url)
  }, 4000)
}

/**
 * Convert base64 Data URL to Blob with exact MIME type
 */
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

export const qrService = {
  /**
   * Generate high-resolution Data URL for the QR code
   * @param {string} payload 
   * @returns {Promise<string>}
   */
  async generateQrDataUrl(payload) {
    if (!payload) return ''
    try {
      return await QRCode.toDataURL(payload, {
        width: 320,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      })
    } catch (err) {
      console.error('Failed to generate QR code data URL:', err)
      return ''
    }
  },

  /**
   * Helper to fetch and convert church logo into base64 Data URL for PDF embedding
   */
  async getLogoDataUrl() {
    try {
      const response = await fetch('/assets/church-logo.png')
      if (!response.ok) return null
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  },

  /**
   * Internal helper to draw a single 100mm x 150mm pass page into a jsPDF document
   */
  _drawPassPage(doc, {
    logoDataUrl,
    eventName = 'Berean Church Event',
    eventDates = '',
    attendeeName = 'Attendee',
    classification = 'Attendee',
    qrDataUrl
  }) {
    // White background
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 100, 150, 'F')

    // Deep Church Navy Header (#0A2540)
    doc.setFillColor(10, 37, 64)
    doc.rect(0, 0, 100, 24, 'F')

    // Vibrant Yellow Stripe (#FFDE00)
    doc.setFillColor(255, 222, 0)
    doc.rect(0, 24, 100, 2.5, 'F')

    // Embed church logo in header with FAST deflate compression
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, 'PNG', 4, 3, 18, 18, undefined, 'FAST')
    }

    // Header Church Title
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('BEREAN BIBLE BAPTIST CHURCH', logoDataUrl ? 25 : 50, 10.5, { align: logoDataUrl ? 'left' : 'center' })

    // Header Subtitle
    doc.setTextColor(255, 222, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('OFFICIAL EVENT REGISTRATION PASS', logoDataUrl ? 25 : 50, 16.5, { align: logoDataUrl ? 'left' : 'center' })

    // Event Title (Centered)
    doc.setTextColor(16, 59, 110)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    const splitEvent = doc.splitTextToSize(eventName, 88)
    doc.text(splitEvent, 50, 33, { align: 'center' })

    let currentY = 33 + (splitEvent.length * 4.5)

    if (eventDates) {
      doc.setTextColor(100, 116, 139)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(eventDates, 50, currentY, { align: 'center' })
      currentY += 4
    }

    // High Resolution QR Code with FAST deflate compression
    const qrSize = 48
    const qrX = (100 - qrSize) / 2
    const qrY = currentY + 1
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST')

    // Attendee Name
    const nameY = qrY + qrSize + 6
    doc.setTextColor(11, 30, 51)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13.5)
    doc.text(attendeeName, 50, nameY, { align: 'center' })

    // Classification Pill Box (Gold/Yellow theme)
    doc.setFillColor(254, 249, 195)
    doc.setDrawColor(250, 204, 21)
    const classText = (classification || 'ATTENDEE').toUpperCase()
    const textWidth = doc.getTextWidth(classText) + 8
    const pillX = (100 - textWidth) / 2
    doc.roundedRect(pillX, nameY + 2.5, textWidth, 6, 2, 2, 'FD')

    doc.setTextColor(133, 77, 14)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text(classText, 50, nameY + 6.8, { align: 'center' })

    // Footer Instructions
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Present this digital PDF on your smartphone or printed pass upon arrival.', 50, 137.5, { align: 'center' })

    // Church Scripture Motto
    doc.setTextColor(16, 59, 110)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.text('“Called out of darkness into His marvelous light” • I Peter 2:9', 50, 142.5, { align: 'center' })

    // Card Outer Border
    doc.setDrawColor(10, 37, 64)
    doc.setLineWidth(0.6)
    doc.roundedRect(2, 2, 96, 146, 3, 3, 'D')
  },

  /**
   * Download high-resolution, compact (~200KB) official QR pass as PDF
   */
  async downloadQrPdf({
    payload,
    attendeeName = 'Attendee',
    classification = 'Attendee',
    eventName = 'Berean Church Event',
    venue = 'Berean Bible Baptist Church Sanctuary',
    eventDates = '',
    filename
  }) {
    const { jsPDF } = await import('jspdf')

    // Clean QR Data URL with optimal dimensions
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    const logoDataUrl = await this.getLogoDataUrl()

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150],
      compress: true
    })

    this._drawPassPage(doc, {
      logoDataUrl,
      eventName,
      eventDates,
      attendeeName,
      classification,
      qrDataUrl
    })

    const pdfBlob = doc.output('blob')
    const safeBaseName = (filename || `${attendeeName}_Berean_Pass`).replace(/[^a-zA-Z0-9_-]/g, '_')
    saveBlob(pdfBlob, `${safeBaseName}.pdf`)
  },

  /**
   * Open the PDF pass directly in a new browser tab for preview or instant print
   */
  async openQrPdfInNewTab({
    payload,
    attendeeName = 'Attendee',
    classification = 'Attendee',
    eventName = 'Berean Church Event',
    venue = 'Berean Bible Baptist Church Sanctuary',
    eventDates = ''
  }) {
    const { jsPDF } = await import('jspdf')
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M'
    })
    const logoDataUrl = await this.getLogoDataUrl()
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150],
      compress: true
    })
    this._drawPassPage(doc, {
      logoDataUrl,
      eventName,
      eventDates,
      attendeeName,
      classification,
      qrDataUrl
    })
    const pdfBlob = doc.output('blob')
    const url = URL.createObjectURL(pdfBlob)
    window.open(url, '_blank')
  },

  /**
   * Download batch of official QR passes into a compact multi-page PDF
   */
  async downloadBatchQrPdf({
    items = [],
    eventName = 'Berean Church Event',
    eventDates = '',
    filename = 'Berean_QR_Passes'
  }) {
    if (!items.length) return
    const { jsPDF } = await import('jspdf')
    const logoDataUrl = await this.getLogoDataUrl()

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [100, 150],
      compress: true
    })

    for (let i = 0; i < items.length; i++) {
      if (i > 0) {
        doc.addPage([100, 150], 'portrait')
      }
      const item = items[i]
      const qrDataUrl = await QRCode.toDataURL(item.payload, {
        width: 320,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M'
      })

      this._drawPassPage(doc, {
        logoDataUrl,
        eventName,
        eventDates,
        attendeeName: item.attendeeName,
        classification: item.classification || 'Attendee',
        qrDataUrl
      })
    }

    const pdfBlob = doc.output('blob')
    const safeBaseName = (filename || 'Berean_QR_Passes').replace(/[^a-zA-Z0-9_-]/g, '_')
    saveBlob(pdfBlob, `${safeBaseName}.pdf`)
  },

  /**
   * Download QR code as PNG image file using Blob to ensure correct extension
   */
  async downloadQrImage(payload, filename = 'Berean-Checkin-QR') {
    const dataUrl = await this.generateQrDataUrl(payload)
    if (!dataUrl) return
    const blob = dataUrlToBlob(dataUrl)
    const safeBaseName = (filename || 'Berean_QR').replace(/[^a-zA-Z0-9_-]/g, '_')
    saveBlob(blob, `${safeBaseName}.png`)
  },

  /**
   * Get active QR credential payload for a registration
   */
  async getCredential(registrationId) {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('issue_qr_credential', {
        p_registration_id: registrationId
      })
      if (error) throw error
      return data?.qr_payload
    }

    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === registrationId && q.is_active)
    if (cred) return cred.payload

    // Generate if not present
    const rawToken = `berean-tok-${Date.now()}`
    const payload = `BEREAN:${registrationId}:${rawToken}`
    store.qr_credentials.push({
      id: `qr-${Date.now()}`,
      registration_id: registrationId,
      token_raw: rawToken,
      payload,
      is_active: true,
      issued_at: new Date().toISOString()
    })
    saveStore(store)
    return payload
  },

  /**
   * Revoke a QR credential
   */
  async revokeCredential(registrationId, reason = 'Administrative revocation') {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('qr_credentials')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_reason: reason
        })
        .eq('registration_id', registrationId)
      if (error) throw error
      return true
    }

    const store = getStore()
    const cred = store.qr_credentials.find(q => q.registration_id === registrationId)
    if (cred) {
      cred.is_active = false
      cred.revoked_at = new Date().toISOString()
      cred.revoked_reason = reason
      saveStore(store)
    }
    return true
  }
}
