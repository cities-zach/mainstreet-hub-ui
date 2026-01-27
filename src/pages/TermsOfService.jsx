import React from "react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">MainSuite Terms of Service</h1>
          <p className="text-sm text-slate-500">Effective Date: January 27, 2026</p>
          <p className="text-sm text-slate-500">
            Governing Law: State of Iowa, United States
          </p>
          <p>
            These Terms of Service ("Terms") govern access to and use of the
            MainSuite platform ("Service"), operated by MainSuite ("MainSuite,"
            "we," "us," or "our"). By accessing or using the Service, you agree
            to these Terms.
          </p>
          <p>
            If you are using MainSuite on behalf of an organization, you
            represent that you are authorized to bind that organization to these
            Terms.
          </p>
        </header>

        <hr className="border-slate-200" />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Description of Service</h2>
          <p>
            MainSuite is a web-based software platform providing tools for
            nonprofit organizations, community programs, and related entities to
            manage events, projects, surveys, volunteers, communications, and
            operational data.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Eligibility and Accounts</h2>
          <p>You must be at least 18 years old to create an account.</p>
          <p>You are responsible for:</p>
          <ul className="list-disc pl-6">
            <li>Maintaining accurate account information</li>
            <li>Safeguarding login credentials</li>
            <li>All activity occurring under your account</li>
          </ul>
          <p>Organizations are responsible for managing user roles and permissions.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Data Ownership and Responsibility</h2>
          <p>
            All data entered into MainSuite by an organization or its users
            remains the property of that organization. MainSuite:
          </p>
          <ul className="list-disc pl-6">
            <li>Acts as a data processor</li>
            <li>Does not claim ownership of organizational content</li>
            <li>Does not use organizational data for advertising or resale</li>
          </ul>
          <p>
            Organizations are responsible for ensuring they have the right to
            collect and store any personal data they upload.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6">
            <li>Use the Service for unlawful purposes</li>
            <li>Upload malicious code or attempt to compromise system security</li>
            <li>Access accounts or data without authorization</li>
            <li>Use the platform to harass, defraud, or impersonate others</li>
            <li>Circumvent usage limits or licensing restrictions</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts for violations.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Service Availability</h2>
          <p>
            The Service is provided on an "as-is" and "as-available" basis.
            While we strive for high availability, we do not guarantee
            uninterrupted service and may perform maintenance, updates, or
            emergency outages without prior notice.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Termination</h2>
          <p>We may suspend or terminate access if:</p>
          <ul className="list-disc pl-6">
            <li>These Terms are violated</li>
            <li>Required fees (if applicable) are not paid</li>
            <li>Use poses security or legal risk</li>
          </ul>
          <p>
            Organizations may request data export prior to termination, subject
            to reasonable technical limitations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
          <p>To the fullest extent permitted under Iowa law:</p>
          <p>MainSuite shall not be liable for:</p>
          <ul className="list-disc pl-6">
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Service interruptions or data loss beyond our reasonable control</li>
          </ul>
          <p>
            Our total liability shall not exceed the amount paid for the Service
            in the twelve months preceding the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless MainSuite and its operators
            from claims arising from:
          </p>
          <ul className="list-disc pl-6">
            <li>Your use of the Service</li>
            <li>Content you upload</li>
            <li>Violation of these Terms</li>
            <li>Violation of applicable laws or third-party rights</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Intellectual Property</h2>
          <p>
            The MainSuite platform, software, branding, and documentation are
            the intellectual property of MainSuite and may not be copied,
            modified, or redistributed without permission. Organizations retain
            all rights to their own data and content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Confidentiality</h2>
          <p>
            We will treat organizational data as confidential and will not
            disclose it except as outlined in the Privacy Policy or required by
            law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">11. Changes to Terms</h2>
          <p>
            We may update these Terms periodically. Continued use of the Service
            after changes constitutes acceptance of the revised Terms. Users may
            be required to re-acknowledge updates upon login.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">12. Governing Law and Venue</h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of the State of Iowa, without regard to conflict of law
            principles. Any legal action shall be brought exclusively in the
            state or federal courts located in Iowa.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">13. Contact Information</h2>
          <p>MainSuite</p>
          <p>
            Email:{" "}
            <a className="text-[#835879] underline" href="mailto:zach@mainsuite.app">
              zach@mainsuite.app
            </a>
          </p>
          <p>State of Organization: Iowa, USA</p>
        </section>
      </div>
    </div>
  );
}
