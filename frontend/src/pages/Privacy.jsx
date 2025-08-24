import React from 'react'

export default function Privacy() {
  return (
    <div style={{ padding: '2rem', maxWidth: '68rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Zylike Privacy Policy</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>Effective date: {new Date().toISOString().slice(0, 10)}</p>

      <p style={{ color: '#4b5563' }}>
        This Privacy Policy explains how Zylike collects, uses, discloses, and safeguards
        information in connection with our websites, apps, and services (the "Services"). By
        using the Services, you consent to the practices described here.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>1. Information We Collect</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li><b>Account data:</b> name, email, password hash, role, and profile details you
            provide.</li>
        <li><b>Usage and analytics:</b> links created, clicks, action logs, device and browser
            information, and IP addresses used for security and fraud prevention.</li>
        <li><b>Payment data:</b> payout account details you submit, managed by trusted payment
            processors; we do not store full bank numbers.</li>
        <li><b>Cookies and similar technologies:</b> used to maintain sessions and improve the
            Services. You can control cookies via browser settings.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>2. How We Use Information</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>Provide, secure, and improve the Services.</li>
        <li>Generate and attribute affiliate links and earnings.</li>
        <li>Communicate important account notices and transactional emails.</li>
        <li>Detect, prevent, and investigate fraud, abuse, and policy violations.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>3. Sharing of Information</h2>
      <p style={{ color: '#4b5563' }}>
        We share data with service providers and integration partners solely to operate the
        Services (for example, affiliate networks for attribution, email service providers for
        sending messages, and payment partners for payouts). We may disclose information to comply
        with law or protect rights and safety. We do not sell personal data.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>4. Data Retention</h2>
      <p style={{ color: '#4b5563' }}>
        We retain information for as long as necessary to provide the Services and meet legal and
        accounting obligations. Retention periods may vary by data type and jurisdiction.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>5. Your Choices</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>Access, update, or delete certain account information in your settings.</li>
        <li>Unsubscribe from non‑essential communications where applicable.</li>
        <li>Disable cookies via browser settings (may impact functionality).</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>6. Security</h2>
      <p style={{ color: '#4b5563' }}>
        We implement administrative, technical, and organizational measures designed to protect
        information. No method of transmission or storage is 100% secure; we cannot guarantee
        absolute security.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>7. International Transfers</h2>
      <p style={{ color: '#4b5563' }}>
        Your information may be processed in countries other than your own. We take steps to
        protect your information in accordance with this Policy wherever it is processed.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>8. Children</h2>
      <p style={{ color: '#4b5563' }}>
        The Services are not directed to children under 13 (or the applicable minimum age in your
        jurisdiction). We do not knowingly collect personal information from children.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>9. Changes to This Policy</h2>
      <p style={{ color: '#4b5563' }}>
        We may update this Policy from time to time. Material changes will be posted here with an
        updated effective date. Your continued use of the Services means you accept the updated
        Policy.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>10. Contact Us</h2>
      <p style={{ color: '#4b5563' }}>
        For questions or privacy requests, contact <a href="mailto:privacy@zylike.com">privacy@zylike.com</a>.
      </p>
    </div>
  )
}


