import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">MainSuite Privacy Policy</h1>
          <p className="text-sm text-slate-500">Effective Date: January 27, 2026</p>
          <p>
            MainSuite ("we," "us," or "our") provides a web-based platform for
            nonprofit organizations, community programs, and their authorized
            users to manage events, projects, surveys, volunteers, and related
            operations.
          </p>
          <p>
            We are committed to protecting the privacy and security of personal
            information entrusted to us. This Privacy Policy explains what
            information we collect, how we use it, and the choices you have.
          </p>
        </header>

        <hr className="border-slate-200" />

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Information We Collect</h2>
          <h3 className="font-semibold">a. Account Information</h3>
          <p>When an organization or user creates an account, we may collect:</p>
          <ul className="list-disc pl-6">
            <li>Name</li>
            <li>Email address</li>
            <li>Organization name</li>
            <li>Role or permission level</li>
            <li>Login credentials (stored in encrypted form)</li>
          </ul>
          <h3 className="font-semibold">b. Organizational Data</h3>
          <p>
            Organizations using MainSuite may upload or enter information such
            as:
          </p>
          <ul className="list-disc pl-6">
            <li>Staff and volunteer records</li>
            <li>Business contacts</li>
            <li>Event registrations</li>
            <li>Survey responses</li>
            <li>Notes, documents, and attachments</li>
          </ul>
          <p>
            This information is controlled by the organization and processed by
            MainSuite solely to provide the service.
          </p>
          <h3 className="font-semibold">c. Public Form Submissions</h3>
          <p>
            When individuals complete public forms or surveys hosted on
            MainSuite, we may collect:
          </p>
          <ul className="list-disc pl-6">
            <li>Names</li>
            <li>Contact information</li>
            <li>Responses to form questions</li>
            <li>Uploaded files (if enabled)</li>
          </ul>
          <h3 className="font-semibold">d. Technical and Usage Data</h3>
          <p>We automatically collect limited technical information, including:</p>
          <ul className="list-disc pl-6">
            <li>IP address</li>
            <li>Browser type and device</li>
            <li>Login timestamps</li>
            <li>Pages accessed</li>
            <li>Cookies or session identifiers for authentication and security</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. How We Use Information</h2>
          <p>We use collected information to:</p>
          <ul className="list-disc pl-6">
            <li>Provide and operate the MainSuite platform</li>
            <li>Authenticate users and control access</li>
            <li>Store and display organization data</li>
            <li>Send system notifications and service communications</li>
            <li>Improve platform performance and security</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do not sell personal data.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Data Ownership</h2>
          <p>
            All data entered by an organization or its users remains the
            property of that organization. MainSuite acts as a data processor
            and does not claim ownership of organizational content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Data Sharing</h2>
          <p>We may share information only in the following limited circumstances:</p>
          <ul className="list-disc pl-6">
            <li>
              With trusted service providers (e.g., hosting, email, security)
              solely to operate the platform
            </li>
            <li>When required by law, subpoena, or court order</li>
            <li>To protect the security or integrity of the system</li>
            <li>
              With the organization that collected the data (for public form
              submissions)
            </li>
          </ul>
          <p>We do not share data for advertising purposes.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data Security</h2>
          <p>We use industry-standard security measures including:</p>
          <ul className="list-disc pl-6">
            <li>Encrypted connections (HTTPS)</li>
            <li>Secure password hashing</li>
            <li>Role-based access controls</li>
            <li>Regular system updates and monitoring</li>
          </ul>
          <p>
            No system is perfectly secure, but we take reasonable steps to
            protect all stored information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Data Retention</h2>
          <p>
            We retain data for as long as an organization maintains an active
            account or as required for legal and operational purposes.
            Organizations may request export or deletion of their data. Public
            form submissions are retained according to the organization&apos;s
            configuration and retention policies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul className="list-disc pl-6">
            <li>Access your personal data</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your data</li>
            <li>Request a copy of your data</li>
          </ul>
          <p>
            Requests should be submitted to:{" "}
            <a className="text-[#835879] underline" href="mailto:zach@mainsuite.app">
              zach@mainsuite.app
            </a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Cookies and Sessions</h2>
          <p>MainSuite uses cookies or similar technologies for:</p>
          <ul className="list-disc pl-6">
            <li>User authentication</li>
            <li>Session management</li>
            <li>Security</li>
            <li>Basic analytics</li>
          </ul>
          <p>
            These are necessary for the platform to function and cannot be fully
            disabled without affecting service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
          <p>
            MainSuite is not intended for use by children under 13. We do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When changes are
            made, the effective date will be updated and users may be prompted to
            re-acknowledge the policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">11. Contact Information</h2>
          <p>MainSuite</p>
          <p>
            Email:{" "}
            <a className="text-[#835879] underline" href="mailto:zach@mainsuite.app">
              zach@mainsuite.app
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
