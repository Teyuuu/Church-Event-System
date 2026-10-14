import React, { useState, useEffect } from 'react'
import { qrService } from './qrService'

export function QRCard({
  churchName = 'Berean Bible Baptist Church',
  eventName,
  attendeeName,
  classification = 'Attendee',
  qrPayload,
  registrationId,
  showBorder = true
}) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    let isMounted = true
    async function renderQr() {
      if (qrPayload) {
        const url = await qrService.generateQrDataUrl(qrPayload)
        if (isMounted) setDataUrl(url)
      } else if (registrationId) {
        const payload = await qrService.getCredential(registrationId)
        const url = await qrService.generateQrDataUrl(payload)
        if (isMounted) setDataUrl(url)
      }
    }
    renderQr()
    return () => { isMounted = false }
  }, [qrPayload, registrationId])

  return (
    <div
      className="badge-card"
      style={{
        border: showBorder ? '2px dashed #0B192C' : 'none',
        borderRadius: '12px',
        padding: '1.25rem',
        textAlign: 'center',
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '340px',
        maxWidth: '320px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Church Logo & Wordmark */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        borderBottom: '2px solid var(--color-brand-yellow-500)',
        paddingBottom: '0.4rem',
        width: '100%'
      }}>
        <img
          src="/assets/church-logo.png"
          alt="Berean Logo"
          style={{ height: '34px', width: 'auto', objectFit: 'contain' }}
        />
        <div className="badge-church-header" style={{
          fontSize: '0.78rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'var(--color-brand-navy-900)'
        }}>
          {churchName}
        </div>
      </div>

      {/* Event Title */}
      <div className="badge-event-title" style={{
        fontSize: '0.95rem',
        fontWeight: 800,
        color: 'var(--color-brand-navy-800)',
        marginTop: '0.5rem',
        lineHeight: 1.2
      }}>
        {eventName}
      </div>

      {/* QR Code Container */}
      <div className="badge-qr-container" style={{ margin: '0.75rem 0' }}>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Check-In QR Code"
            style={{
              width: '150px',
              height: '150px',
              display: 'block',
              margin: '0 auto',
              borderRadius: '6px'
            }}
          />
        ) : (
          <div style={{
            width: '150px',
            height: '150px',
            background: '#F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            color: '#64748B'
          }}>
            Generating QR...
          </div>
        )}
      </div>

      {/* Attendee Name */}
      <div>
        <div className="badge-attendee-name" style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          color: '#0B192C',
          lineHeight: 1.15
        }}>
          {attendeeName}
        </div>
        <div className="badge-classification" style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'inline-block',
          background: '#FEF3C7',
          color: '#B45309',
          padding: '2px 8px',
          borderRadius: '4px',
          marginTop: '0.35rem'
        }}>
          {classification}
        </div>
      </div>

      {/* Footer Instructions */}
      <div className="badge-footer-instructions" style={{
        fontSize: '0.75rem',
        color: '#64748B',
        marginTop: '0.5rem',
        borderTop: '1px solid #E2E8F0',
        paddingTop: '0.4rem',
        width: '100%'
      }}>
        Present this pass to the usher at the check-in desk.
      </div>
    </div>
  )
}
