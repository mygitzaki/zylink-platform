import React from 'react'

export default function Terms() {
  return (
    <div style={{ padding: '2rem', maxWidth: '68rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Zylike Terms of Service</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>Effective date: {new Date().toISOString().slice(0, 10)}</p>

      <p style={{ color: '#4b5563' }}>
        Welcome to Zylike. These Terms of Service ("Terms") govern your access to and use of the
        Zylike platform, including our websites, apps, APIs, and related services (collectively,
        the "Services"). By creating an account or using the Services, you agree to these Terms.
        If you are using the Services on behalf of an entity, you represent that you have
        authority to bind that entity.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>1. What Zylike Does</h2>
      <p style={{ color: '#4b5563' }}>
        Zylike enables creators to generate affiliate short links, track clicks and attributed
        actions, and receive payouts on approved earnings. Zylike integrates with third parties
        such as Impact.com and participating retailers (e.g., Walmart) to facilitate tracking and
        attribution. Zylike is not a party to transactions between retailers and customers and
        does not guarantee commissions, conversions, or availability of third‑party programs.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>2. Eligibility and Accounts</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>You must be at least 18 years old and capable of forming a binding contract.</li>
        <li>You must provide accurate information and keep it current.</li>
        <li>You are responsible for all activity under your credentials and for maintaining
            account security.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>3. Creator Responsibilities</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>Use links and promotional materials in compliance with applicable laws, retailer
            program rules, and Federal Trade Commission (FTC) endorsement guidelines, including
            clear and conspicuous disclosure of affiliate relationships.</li>
        <li>Do not spam, mislead, engage in fraudulent clicks or conversions, or otherwise abuse
            tracking systems. We may withhold or reverse earnings associated with suspected
            abuse, fraudulent activity, or policy violations.</li>
        <li>Respect retailer brand guidelines and prohibited channels (e.g., certain paid search
            or coupon sites) where applicable.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>4. Links, Tracking, and Attribution</h2>
      <p style={{ color: '#4b5563' }}>
        Zylike generates trackable links and may attach sub‑identifiers (e.g., SubId1) to
        attribute clicks and actions to your account. Attribution and earnings are ultimately
        determined by the applicable third‑party program (e.g., Impact.com) and retailer. Zylike
        may display estimated analytics for convenience; final approved earnings may differ.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>5. Earnings and Payouts</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>Earnings accrue only on actions approved and reported by the third‑party program.</li>
        <li>Reversed, cancelled, or returned orders may be deducted from your balance.</li>
        <li>You must provide accurate payout details and any tax information required by law.</li>
        <li>We may set minimum payout thresholds, payout schedules, and processing timelines.
            Bank fees and currency conversion may apply.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>6. Taxes</h2>
      <p style={{ color: '#4b5563' }}>
        You are solely responsible for all taxes related to your earnings. We may collect and
        report taxpayer information where required.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>7. Acceptable Use</h2>
      <ul style={{ color: '#4b5563', paddingLeft: '1.25rem' }}>
        <li>No unlawful activity, harassment, hate, or intellectual‑property infringement.</li>
        <li>No interference with the Services or attempt to circumvent security or tracking.</li>
        <li>No scraping or use of the Services for competitive analysis without consent.</li>
      </ul>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>8. Intellectual Property</h2>
      <p style={{ color: '#4b5563' }}>
        Zylike and its licensors own all rights in the Services. You receive a limited,
        revocable, non‑transferable license to use the Services as provided. Retailer brands and
        third‑party marks are the property of their respective owners.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>9. Third‑Party Services</h2>
      <p style={{ color: '#4b5563' }}>
        The Services interoperate with third parties such as Impact.com, Mailgun, payment
        providers, and retailers. Their terms and privacy policies apply to your use of those
        services. Zylike is not responsible for third‑party outages, data accuracy, or policy
        changes that affect your use or earnings.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>10. Disclaimers</h2>
      <p style={{ color: '#4b5563' }}>
        The Services are provided “as is” and “as available.” We disclaim all warranties to the
        maximum extent permitted by law, including implied warranties of merchantability, fitness
        for a particular purpose, and non‑infringement. We do not warrant uninterrupted or
        error‑free operation, or that tracking or attribution will always be accurate.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>11. Limitation of Liability</h2>
      <p style={{ color: '#4b5563' }}>
        To the fullest extent permitted by law, Zylike will not be liable for indirect, incidental,
        special, consequential, or punitive damages, or for lost profits or revenues. Our total
        liability for any claim relating to the Services will not exceed the amounts paid to you
        by Zylike in the twelve (12) months preceding the event giving rise to the claim.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>12. Indemnification</h2>
      <p style={{ color: '#4b5563' }}>
        You agree to defend and indemnify Zylike from claims arising out of your use of the
        Services, your content, your links, or your violation of these Terms or applicable law.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>13. Suspension and Termination</h2>
      <p style={{ color: '#4b5563' }}>
        We may suspend or terminate access for suspected fraud, abuse, policy violations, or
        risk to the platform. You may stop using the Services at any time. Certain provisions
        survive termination, including those on intellectual property, disclaimers, limitation of
        liability, and indemnification.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>14. Changes</h2>
      <p style={{ color: '#4b5563' }}>
        We may update these Terms to reflect changes to the Services or the law. Material
        changes will be posted on this page with an updated effective date. Continued use after
        changes means you accept the revised Terms.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>15. Governing Law</h2>
      <p style={{ color: '#4b5563' }}>
        These Terms are governed by the laws of the jurisdiction where Zylike is organized,
        without regard to conflict of law rules. Venue for disputes will be in that location,
        unless otherwise required by law.
      </p>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '1.75rem' }}>16. Contact</h2>
      <p style={{ color: '#4b5563' }}>
        Questions? Contact <a href="mailto:support@zylike.com">support@zylike.com</a>.
      </p>
    </div>
  )
}


