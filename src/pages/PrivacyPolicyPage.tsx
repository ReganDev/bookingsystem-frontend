import { Link } from 'react-router-dom'
import {
  PRIVACY_SECTIONS,
  hasUnfilledDetails,
  privacyDetails,
  providers,
  retentionPeriods,
  unfilledDetailKeys,
} from '../content/privacyPolicy'

const {
  serviceName,
  appDomain,
  legalEntity,
  companyNumber,
  registeredAddress,
  basedIn,
  privacyEmail,
  icoRegistrationNumber,
  lastUpdated,
} = privacyDetails

export function PrivacyPolicyPage() {
  return (
    <article className="card policy-page">
      {hasUnfilledDetails() && (
        <p className="policy-warning" role="alert">
          This policy is not ready to publish. Fill in{' '}
          <code>{unfilledDetailKeys().join(', ')}</code> in{' '}
          <code>src/content/privacyPolicy.ts</code>.
        </p>
      )}

      <header className="policy-header">
        <h2>Privacy policy</h2>
        <p className="policy-updated">Last updated: {lastUpdated}</p>
        <p>
          This policy explains what {serviceName} does with personal
          information, and what rights you have over it. It covers both the
          businesses that use {serviceName} to take bookings, and the customers
          who book with them at {appDomain}.
        </p>
      </header>

      <nav className="policy-contents" aria-label="Sections of this policy">
        <h3>Contents</h3>
        <ol>
          {PRIVACY_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      <section id="who-we-are" className="policy-section">
        <h3>Who we are</h3>
        <p>
          {serviceName} is booking software operated by {legalEntity}
          {companyNumber
            ? `, registered under company number ${companyNumber}`
            : ''}
          {basedIn ? `, based in ${basedIn}` : ''}.
          {registeredAddress ? ` Our address is ${registeredAddress}.` : ''}
        </p>
        <p>
          For anything to do with your personal information, email us at{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
        {icoRegistrationNumber && (
          <p>
            We are registered with the Information Commissioner&apos;s Office
            (ICO), registration number {icoRegistrationNumber}.
          </p>
        )}
      </section>

      <section id="our-roles" className="policy-section">
        <h3>Our two roles</h3>
        <p>
          Data protection law distinguishes between the organisation that
          decides how personal information is used (the <strong>controller</strong>)
          and one that handles it on that organisation&apos;s behalf (the{' '}
          <strong>processor</strong>). {serviceName} is both, depending on whose
          information it is.
        </p>
        <p>
          <strong>We are the controller</strong> for the accounts businesses and
          customers create with us, for enquiries sent through our contact form,
          and for keeping the service running and secure.
        </p>
        <p>
          <strong>We are the processor</strong> for the customer and booking
          records a business keeps in {serviceName}. That business decides what
          to record and how long to keep it; we only act on its instructions. If
          you booked an appointment and want your details changed or removed,
          contact the business you booked with first. You can also contact us
          and we will help.
        </p>
      </section>

      <section id="what-we-collect" className="policy-section">
        <h3>What information we collect</h3>
        <p>If you create an account, we collect:</p>
        <ul>
          <li>your first and last name</li>
          <li>your email address</li>
          <li>your phone number, if you give us one</li>
          <li>your password, which we store only as a one-way hash</li>
          <li>your business name and contact details, if you run a business</li>
        </ul>
        <p>If you book an appointment, the business you book with collects:</p>
        <ul>
          <li>your name, email address and phone number</li>
          <li>the service, date and time you booked, and the price</li>
          <li>any notes you add to your booking</li>
          <li>
            <strong>your address and postcode</strong>, but only when the
            service takes place at your address rather than at the
            business&apos;s premises
          </li>
          <li>
            the driving distance and travel time between the business and that
            address, worked out from postcodes
          </li>
          <li>
            whether you ticked the email and text-message options on the
            booking form. These choices are recorded, but they do not currently
            change what we send — see below
          </li>
        </ul>
        <p>
          Every booking is confirmed by email, whether or not you tick
          &ldquo;Email me my booking details&rdquo;. That email contains the
          booking details and a private link for cancelling or rescheduling the
          booking. If you cancel or move a booking online, we email the
          business to let it know. We do not send booking reminders — nothing
          in {serviceName} currently sends one. We do not send text messages,
          and your phone number is not shared with any messaging service; the
          text option on the booking form cannot be selected yet.
        </p>
        <p>
          <strong>Booking without signing in creates an account.</strong> When
          you start a booking without signing in, we create a customer account
          in your name with your email address and phone number, unless your
          email address already has one. We save the booking request, with any
          notes and visit address, while you confirm the code we email you. The
          code stops working after 10 minutes. If you confirm it, your booking
          is made, and if the account is new we email you a link to set a
          password so you can sign in later; you do not have to use it. If you
          never confirm, the booking is not made, but the account and the
          request are kept until you ask us to delete them.
        </p>
        <p>
          Businesses can also add notes about their customers, and upload photos
          of their premises and work.
        </p>
        <p>
          If you send us an enquiry, we collect your name, email address,
          business name if you give one, and your message.
        </p>
        <p>
          We also collect some technical data automatically as part of running
          the service:
        </p>
        <ul>
          <li>your IP address</li>
          <li>standard web request logs</li>
          <li>
            the number of wrong codes entered when confirming a booking, and
            when codes and links were last sent, used to limit abuse
          </li>
        </ul>
      </section>

      <section id="lawful-basis" className="policy-section">
        <h3>Why we collect it, and our lawful basis</h3>
        <ul>
          <li>
            <strong>To provide the service you asked for</strong> — creating
            your account (including the one created when you book without
            signing in), taking and managing your bookings, letting you sign in,
            and emailing you confirmation of each booking with a link to manage
            it. Lawful basis: <em>performance of a contract</em>.
          </li>
          <li>
            <strong>To keep the service running, secure and free of abuse</strong>{' '}
            — verifying email addresses, limiting repeated attempts, and keeping
            server logs. Lawful basis: <em>legitimate interests</em>, namely
            running a functioning and secure service.
          </li>
          <li>
            <strong>To reply to your enquiry.</strong> Lawful basis:{' '}
            <em>legitimate interests</em>, namely responding to someone who
            contacted us.
          </li>
          <li>
            <strong>To keep records we are legally required to keep</strong>,
            such as records relevant to tax. Lawful basis:{' '}
            <em>legal obligation</em>.
          </li>
        </ul>
      </section>

      <section id="how-we-use-it" className="policy-section">
        <h3>How we use your information</h3>
        <p>
          We use it to run the booking service and nothing else. We never sell
          or rent your information, we never share it with anyone for their own
          marketing or advertising, and we never hand it to a data broker. We do
          not build advertising profiles, and we do not make any decision about
          you by automated means. The only people and companies who see your
          information are the ones listed in the next two sections, and each of
          them sees it solely so the booking service can work.
        </p>
        <p>
          We do not take payments through {serviceName}. Prices are recorded so
          a business can see what a booking is worth, but you pay the business
          directly, outside this service.
        </p>
      </section>

      <section id="sharing" className="policy-section">
        <h3>Who we share it with</h3>
        <ul>
          <li>
            <strong>The business you booked with</strong> receives the details
            of your booking. That is the point of making one.
          </li>
          <li>
            <strong>Our service providers</strong>, listed in the next section,
            handle information on our behalf. Most do so under contract; the
            one exception is the free routing service, which is a public demo
            server we have no contract with and which never receives anything
            that identifies you — see the note below.
          </li>
          <li>
            <strong>A small number of our own staff</strong> can access accounts
            to provide support and keep the service running.
          </li>
          <li>
            <strong>Authorities or advisers</strong>, where the law requires it
            or to establish or defend a legal claim.
          </li>
        </ul>
      </section>

      <section id="providers" className="policy-section">
        <h3>Third-party service providers</h3>
        <p>
          We use trusted providers to operate {serviceName}. They process
          personal information on our behalf and may not use it for their own
          purposes.
        </p>
        <dl className="policy-providers">
          {providers.map((provider) => (
            <div key={provider.name} className="policy-provider">
              <dt>{provider.name}</dt>
              <dd>
                <p>{provider.purpose}.</p>
                <p className="policy-provider-meta">
                  Receives: {provider.receives}. Processed in:{' '}
                  {provider.location}.
                </p>
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Two of these deserve a note. Postcode lookup and distance calculation
          use free public services: the postcode service receives a postcode on
          its own, and the routing service receives{' '}
          <strong>coordinates only</strong> — never a name, address or booking
          detail. The routing service is a public demo server we have no
          contract with, which is why we send it nothing that identifies anyone.
        </p>
        <p>
          If we add a provider in future — for example a text-message service or
          a payment provider — we will update this list before it handles any of
          your information.
        </p>
      </section>

      <section id="transfers" className="policy-section">
        <h3>Where your information is processed</h3>
        <p>
          Some of our providers are based outside the UK, mainly in the United
          States and the European Economic Area, as set out above. Where
          information leaves the UK, we rely on the UK Government&apos;s
          adequacy regulations, or on the International Data Transfer Agreement
          or Addendum approved by the ICO, so that your information keeps
          essentially the same protection it has here.
        </p>
      </section>

      <section id="retention" className="policy-section">
        <h3>How long we keep it</h3>
        <p>
          We keep personal information only as long as we need it for the
          purposes above. For customer and booking records, a business is the
          controller and sets its own retention — the periods below marked as
          a default are BookingBase&apos;s platform default for those rows,
          not a fixed commitment, and a business can shorten, extend or
          delete its records sooner at any time.
        </p>
        <dl className="policy-retention">
          {retentionPeriods.map((entry) => (
            <div key={entry.category} className="policy-retention-row">
              <dt>{entry.category}</dt>
              <dd>
                {entry.period}
                {entry.controller === 'business-default' && (
                  <>
                    {' '}
                    <em>
                      (BookingBase&apos;s default; the business may set a
                      different period.)
                    </em>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          Where a business is the controller of its own customer and booking
          records, that business sets the retention period and can delete
          records at any time.
        </p>
      </section>

      <section id="security" className="policy-section">
        <h3>How we keep it secure</h3>
        <ul>
          <li>
            Everything you send travels over an encrypted HTTPS connection.
          </li>
          <li>
            Passwords are stored as one-way hashes. Nobody at{' '}
            {serviceName} can read your password.
          </li>
          <li>
            Signing in issues a short-lived access token that expires after 15
            minutes, alongside a refresh token that lasts 7 days.
          </li>
          <li>
            Accounts must verify their email address before they can be used,
            and booking without signing in requires a code sent to your email.
          </li>
          <li>
            The cancel and reschedule link in each booking email is unique and
            cannot be guessed, but anyone who has it can see that booking and
            change it, so do not forward the email. The link does not expire;
            changes are accepted until the business&apos;s cancellation notice
            period before the appointment.
          </li>
          <li>
            Businesses can only see their own customers and bookings. Our
            database sits behind the service and is not reachable from your
            browser.
          </li>
        </ul>
        <p>
          No service can promise perfect security, but we take these measures
          seriously and review them as the service grows.
        </p>
      </section>

      <section id="cookies" className="policy-section">
        <h3>Cookies and browser storage</h3>
        <p>
          We use <strong>no analytics</strong>, no advertising, no tag manager
          and no tracking cookies. Nothing here follows you between websites,
          which is why you were not asked to accept cookies.
        </p>
        <p>
          When you sign in, we store your session in your browser&apos;s local
          storage so you stay signed in. It is strictly necessary to provide a
          service you asked for, and signing out removes it. Clearing your
          browser data removes it too.
        </p>
        <p>
          If you choose a light or dark theme, we remember that choice in your
          browser&apos;s local storage. It contains nothing about you, and
          choosing &ldquo;Match device&rdquo; removes it.
        </p>
        <p>
          While you are partway through making a booking, we save your
          progress — including any notes and, for a mobile-visit service, the
          address you have entered — in your browser&apos;s session storage,
          so you do not lose it if you navigate away. This is cleared when you
          submit the booking, and it is cleared automatically when you close
          the tab.
        </p>
        <p>
          If you create an account partway through booking, we also keep a note
          of which page to send you back to after you verify your email. That
          is a page address, not personal information, and it is removed once
          you are returned.
        </p>
        <p>
          This site can be installed and used offline. The files that make up
          the app itself are cached on your device for that purpose, but no
          personal data is stored in that cache — requests for your data are
          always sent to our server, never served from the cache.
        </p>
        <p>
          The typefaces on this site load from Google Fonts, which receives your
          IP address as part of that request.
        </p>
      </section>

      <section id="rights" className="policy-section">
        <h3>Your data protection rights</h3>
        <p>Under UK data protection law you have the right to:</p>
        <ul>
          <li>
            <strong>be informed</strong> about how your information is used —
            which is what this policy is for
          </li>
          <li>
            <strong>access</strong> a copy of the information we hold about you
          </li>
          <li>
            <strong>rectification</strong> — have inaccurate information
            corrected
          </li>
          <li>
            <strong>erasure</strong> — ask us to delete your information, where
            we have no overriding reason to keep it
          </li>
          <li>
            <strong>restrict processing</strong> — ask us to pause using your
            information while a concern is resolved
          </li>
          <li>
            <strong>data portability</strong> — receive your information in a
            portable format
          </li>
          <li>
            <strong>object</strong> to processing we base on legitimate
            interests
          </li>
          <li>
            <strong>rights around automated decisions</strong> — though we make
            none
          </li>
        </ul>
        <p>Exercising these rights is free, and we will not treat you differently for it.</p>
      </section>

      <section id="exercising-rights" className="policy-section">
        <h3>Getting a copy of your data, or deleting it</h3>
        <p>
          Email <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> and tell us
          what you would like. We may ask you to confirm your identity so we do
          not hand your information to someone else. We will respond within one
          month, and will tell you if we need longer because the request is
          complex.
        </p>
        <p>
          If your request is about a booking you made with a business, contact
          that business first — they control those records. Tell us if you
          cannot reach them and we will help.
        </p>
      </section>

      <section id="withdrawing-consent" className="policy-section">
        <h3>Withdrawing your consent</h3>
        <p>
          None of the processing described in this policy currently relies on
          your consent — the lawful bases we rely on are performance of a
          contract, legitimate interests, and legal obligation, as set out
          above. If that changes in future, we will update this policy to say
          what we are asking your consent for and give you a clear way to
          withdraw it. If you have any concern about how your information is
          used in the meantime, email{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.
        </p>
      </section>

      <section id="complaints" className="policy-section">
        <h3>How to complain</h3>
        <p>
          If you are unhappy with how we have handled your information, please
          tell us first at{' '}
          <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a> so we can put it
          right.
        </p>
        <p>
          You also have the right to complain to the Information
          Commissioner&apos;s Office, the UK regulator for data protection:
        </p>
        <ul>
          <li>
            <a
              href="https://ico.org.uk/make-a-complaint/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ico.org.uk/make-a-complaint
            </a>
          </li>
          <li>Helpline: 0303 123 1113</li>
          <li>
            Information Commissioner&apos;s Office, Wycliffe House, Water Lane,
            Wilmslow, Cheshire SK9 5AF
          </li>
        </ul>
      </section>

      <section id="changes" className="policy-section">
        <h3>Changes to this policy</h3>
        <p>
          We update this policy when the service changes. The date at the top
          shows when it last changed. If a change materially affects how we use
          your information, we will tell account holders by email.
        </p>
        <p className="policy-back">
          <Link to="/book">Back to booking</Link> ·{' '}
          <Link to="/contact">Contact us</Link>
        </p>
      </section>
    </article>
  )
}
