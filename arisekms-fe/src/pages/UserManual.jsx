import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BarChartIcon,
  BookOpen01Icon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  File02Icon,
  GridViewIcon,
  HelpCircleIcon,
  Home01Icon,
  Medal01Icon,
  TrophyIcon,
  Upload01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { PageHero } from '@/components/PageHero.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { effectiveRole, getTokenRoles, ROLE } from '@/lib/rbac.js';
import { cn } from '@/lib/utils.js';

const CAPTURED = 'November 2026';

// Screenshots live in public/manual/<shot>.png (npm run manual:shots).
// Missing files hide gracefully so structure and captures land independently.
function Shot({ shots }) {
  const [failed, setFailed] = useState({});
  const visible = (shots ?? []).filter((s) => s?.src && !failed[s.src]);
  if (visible.length === 0) return null;
  return (
    <>
      {visible.map((s) => (
        <figure key={s.src} className="mt-4 overflow-hidden rounded-lg border border-border">
          <img
            src={`/manual/${s.src}`}
            alt={s.caption}
            onError={() => setFailed((f) => ({ ...f, [s.src]: true }))}
            className="w-full"
            loading="lazy"
          />
          <figcaption className="bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
            {s.caption} · Captured {CAPTURED}
          </figcaption>
        </figure>
      ))}
    </>
  );
}

const MANUAL = {
  [ROLE.MEMBER]: [
    {
      id: 'u-home',
      title: 'Start at Home',
      icon: Home01Icon,
      body: [
        'Home is your landing page after login. At the top, three cards summarize your own footprint: My Certifications (your SkillsBuild certificates), My Reports (your submissions), and Knowledge Items (shared manuals and guides). Each card links straight to its page.',
        'Below the cards, the Member Growth chart plots active versus inactive members over time, and the Timeline lists the latest events across the workspace — new knowledge documents, certificates, and reports as they land.',
        'The Submitted Reports panel at the bottom shows weekly submissions by category for the last 26 weeks, so you can see reporting rhythm at a glance.',
        'The top bar works everywhere: press / anywhere to jump to search, which finds both pages (Submit Reports, Membership Form, Activity…) and knowledge documents. The lightning icon replays the guided tour; the bell lists everything waiting on you; the info icon explains the system.',
        'The sidebar takes you to the main areas: Home, Submit Reports, Membership Form, Knowledge Products, Activity, and Leaderboards. The Help Center at the bottom holds this manual, the Privacy Policy, and Support.',
      ],
      shots: [{ src: 'member-home.png', caption: 'Member home dashboard' }],
      links: [],
    },
    {
      id: 'u-membership',
      title: 'Apply for membership',
      icon: UserAdd01Icon,
      body: [
        'Open the Membership Form to start or continue your application. New members first enter a company name and click Start application; returning members land directly on their draft. The header always shows the application status — draft, submitted, approved, or rejected — and who you are applying as.',
        'The wizard has five tabs with a progress bar on top: Company, Primary Contact, Additional Contacts, UN & CSR, and Other Info. A teal check means the tab validates; the highlighted circle is where you are. You can click any completed step to go back, but moving forward always goes through Continue, which saves the tab only when every field validates.',
        'Tab 1 (Company) covers five blocks. A: identity — Company Name (editable here), legal representative name and title, applicant and registration countries. B: legal registration — upload the proof (PDF, DOC, JPG, or PNG up to 100MB each) or, if you attach nothing, explain why in the text box. C: classification — pick your Industry Sector from the 28-option dropdown (required, free text is rejected), answer the trade-association questions, and fill exchange or parent-company details if they apply. D: registered address with street, city, province, ZIP, and country. E: website (https:// is added automatically), fax (optional), staff count (a whole number of 1 or more), and annual revenue.',
        'Tab 2 (Primary Contact) requires first and last name, a valid email, and a phone number with at least 7 digits. Tick “same as registered” to copy the company address, or fill the contact address manually. Tab 3 (Additional Contacts) is skippable when empty, but any listed contact must have a name, valid email, and a contact type such as Primary, Billing, Technical, or Authorized Representative.',
        'Tab 4 (UN & CSR) asks the UN Global Compact yes/no question plus other agency affiliations. Tab 5 (Other Info) needs a business overview and a geographic focus. On the last tab the button becomes Submit for review: the server re-validates everything, and missing items come back as one clear error listing what to fix.',
        'While submitted, editing is locked until the secretariat decides — the page says so explicitly. A rejection returns the application to draft with the reviewer feedback shown in red at the top; fix it and resubmit. Editing an approved profile reopens the review cycle, so approved companies see a teal notice that saving returns them to draft.',
      ],
      shots: [{ src: 'member-form.png', caption: 'Membership application, Company tab' }],
      links: [{ to: '/membership-form', label: 'Membership Form', hint: 'Apply for or update membership.' }],
    },
    {
      id: 'u-reports',
      title: 'Submit reports',
      icon: Upload01Icon,
      body: [
        'The Submit Reports card starts with a report-type dropdown: Quarterly Accomplishment Reports, Good Practices, Annual Accomplishment Reports, or Success Stories. The line underneath always tells you the current state of that type — which file is on record and its status — or “Not submitted yet”.',
        'Drag a file onto the dropzone or click to browse, then find it listed as a chip with the category prefix and a remove button. You can stage one file per category (four total); the counter reads “N of 4 attached”. Discard clears the staging area without touching anything already submitted.',
        'Submit sends only the selected type; Submit all sends every staged file at once. Each upload lands as Submitted and waits for admin review — approval and rejection happen on the admin side, and the status follows the file everywhere it appears.',
        'Below the upload card, your report history lists every submission with its type, status badge, and date. Use the eye icon to preview, the download icon to fetch the file, and track decisions on the Report Summary page.',
      ],
      shots: [{ src: 'member-submit.png', caption: 'Submit Reports page' }],
      links: [{ to: '/submit-reports', label: 'Submit Reports', hint: 'File a new report.' }],
    },
    {
      id: 'u-activity',
      title: 'Log activities and certificates',
      icon: Medal01Icon,
      body: [
        'The Activity page opens on a full-screen hero with four actions: Access IBM SkillsBuild (opens skillsbuild.org in a new tab), Leaderboards, Add Certificate, and Add Activity. The last two open modal dialogs over a dimmed page.',
        'Add Certificate records a completed SkillsBuild course for verification. Member Name, Course, and Date Issued are required; Issuer defaults to IBM SkillsBuild and Credential ID is optional. Clicking Record certificate files it as Pending — it only moves you up the leaderboards after an admin verifies it. The “View my certificates” link jumps straight to the leaderboard filtered to you.',
        'Add Activity logs a performance entry. Title is the only strictly required field; then pick one of the seven activity types (International response, Youth, Technical assistance, F2F training, SkillsBuild, Collaboration, Other) and the target audience it served — Barangay Officials, ERT, General Public, LGU Staff, School Faculty & Students, or Youth Groups. Add the event Date, Youth count, and Trained count (F2F) where they apply, tick International response when relevant, and leave Notes for optional context. Submit for review files it as Submitted.',
        'Entries feed the performance KPIs only after an admin approves them: international responses, youth reached, technical assistance, F2F trained totals, and collaborations are all approved-only sums. Rejected entries stay visible with their status so you know what did not count.',
      ],
      shots: [
        { src: 'member-activity.png', caption: 'Activity page with quick actions' },
        { src: 'member-activity-cert.png', caption: 'Add Certificate dialog' },
        { src: 'member-activity-log.png', caption: 'Add Activity dialog' },
      ],
      links: [{ to: '/activity', label: 'Activity', hint: 'Certificates and performance entries.' }],
    },
    {
      id: 'u-knowledge',
      title: 'Share knowledge documents',
      icon: File02Icon,
      body: [
        'Knowledge Products is the shared library. Search by title, description, or ID, filter by category in the sidebar, and open any approved document with Preview or Download.',
        'Members upload through the Upload Document button: pick a category (or add a new one), add a title and description, and attach the file. Your upload lands as Submitted and stays visible to you with its status badge while the secretariat reviews it — it appears for everyone else only after approval.',
        'Own pending documents can be edited or deleted from their cards: editing details or replacing the file keeps them in review, and a rejection shows the reviewer reason with an Edit-and-resubmit path. The Activity button on any of your documents opens its timeline — uploaded, edited, approved or rejected, with actor and time.',
      ],
      shots: [{ src: 'member-knowledge.png', caption: 'Knowledge Products library' }],
      links: [{ to: '/knowledge-products', label: 'Knowledge Products', hint: 'Browse and share documents.' }],
    },
    {
      id: 'u-profile',
      title: 'Manage your profile',
      icon: UserGroupIcon,
      body: [
        'The Profile page holds your account. The About tab shows name, email, and gender — click Edit to change them; username and role are fixed and only an IT admin can change those.',
        'Set a profile picture with Upload (JPG or PNG); Remove deletes it. Changing your password needs the current password plus the new one twice — on success every device is signed out, including this one, so sign in again. The Sign out all devices button does the same without changing the password; confirm and you land back at login.',
      ],
      shots: [{ src: 'member-profile.png', caption: 'Profile page with account settings' }],
      links: [],
    },
    {
      id: 'u-leaderboards',
      title: 'Check the leaderboards',
      icon: TrophyIcon,
      body: [
        'The board ranks companies by verified SkillsBuild certificates. Two filter rows sit on top: All Records versus Approved Only (pending certificates count only under All Records), and the time window — All Time, Today, Last 7 Days, Last 30 Days, or Last Quarter.',
        'The top three companies get a podium with rank badges and trophy icons; everyone else lists in the table below with rank, company, member count, 7-day, 30-day, and total certificate columns. Ten rows show per page with Previous / Next when the list grows.',
        'Selecting any company opens its detail panel: member and certificate totals, a 30-day submission sparkline, a Verified-versus-Pending bar, the member roster with usernames, and its most recent certificates with status and issue dates. Selecting nobody shows the leading company by default.',
        'Certificates only appear once recorded through the Activity page, and only verified ones move a company up under the default Approved Only view — Pending items are visible but do not score.',
      ],
      shots: [{ src: 'member-leaderboards.png', caption: 'Leaderboards with time-range filters' }],
      links: [{ to: '/leaderboards', label: 'Leaderboards', hint: 'Top certifying companies.' }],
    },
    {
      id: 'u-help',
      title: 'Get help',
      icon: HelpCircleIcon,
      body: [
        'Open a support ticket from the Support page: give it a title, pick the category (Report submission, Knowledge Products, Membership, SkillsBuild, Account access, or Other), and set a priority. Tickets move from Open to In progress to Resolved, and the full thread stays on the ticket.',
        'The topbar bell lists everything currently waiting on you — submitted reports, submitted activities, your pending documents, and open tickets — each linking straight to its screen, with a count badge so you notice at a glance.',
        'The lightning icon replays the guided tour anytime: flip through the per-role steps with their screenshots to find your way around.',
        'The info icon opens the About box with your current role, links to this manual and Support, and the Powered-by row naming the platform partners.',
      ],
      shots: [],
      links: [
        { to: '/support', label: 'Support', hint: 'Submit and track help tickets.' },
        { to: '/privacy-policy', label: 'Privacy Policy', hint: 'How your personal data is handled.' },
      ],
    },
  ],
  [ROLE.IT_ADMIN]: [
    {
      id: 'a-overview',
      title: 'Start at the Secretariat Overview',
      icon: GridViewIcon,
      body: [
        'The Secretariat Overview is the morning check. Four cards summarize the network — Active Members (with inactive and total counts), Certifications Submitted, Submitted Reports, and Knowledge Items — each linking to its area.',
        'Below them, three queue cards count exactly what needs decisions: Pending reports awaiting approval, Pending certificates awaiting verification, and Open tickets awaiting triage. Every card links straight to the Approvals page.',
        'The company table attributes every report, certificate, and open ticket to its author’s company, with per-company counts and ten rows per page. The Recent Activity feed closes the page with the latest submissions across all queues.',
        'Use the overview to triage the day: clear the queues first, then read the analytics pages for the bigger picture.',
      ],
      shots: [{ src: 'admin-overview.png', caption: 'Secretariat overview dashboard' }],
      links: [],
    },
    {
      id: 'a-approvals',
      title: 'Decide membership applications',
      icon: CheckmarkCircle01Icon,
      body: [
        'The Approvals page holds four tabs with live counts: Reports, Certificates, Documents, and Membership. Switch tabs to work each queue; the counts tell you where the backlog sits.',
        'Each row shows the item, its category or course, who submitted it and from which company, and when. The eye icon previews a file without downloading; the download icon fetches it for closer reading; the history icon opens the document activity timeline.',
        'Decide per row with Approve or Reject. Approving is one click; rejecting asks for a reason, and for membership applications that reason is shown to the member with the application returned to draft so they know exactly what to fix. Rejected knowledge documents stay visible to their author with the reason and an edit-to-resubmit path.',
        'Checkboxes select multiple rows for bulk approve or reject in one pass — useful after events when dozens of certificates land together. The acting indicator and toasts confirm every decision; the row leaves the pending queue immediately.',
      ],
      shots: [{ src: 'admin-approvals.png', caption: 'Approvals queue' }],
      links: [{ to: '/admin-approvals', label: 'Approvals', hint: 'Decide membership applications.' }],
    },
    {
      id: 'a-directory',
      title: 'Manage members and companies',
      icon: UserGroupIcon,
      body: [
        'The Members tab lists every account with its company, Active/Inactive badge, join date, and an Enable/Disable action. Search by name, email, or username; filter by status; page through with the Show control (10, 25, 50, or 100 rows) and Previous / Next. Disabling is reversible and takes effect on next login.',
        'The Companies tab replaces the old create form with search plus two filters: Industry (the same 28-sector taxonomy as the application form) and Status, where Active means an approved membership and everything else reads as Inactive. Ten companies show per page.',
        'Selecting a company opens its dossier: member count and join date, report/certificate/open-ticket badges, submitted-versus-approved breakdown bars, a six-month submissions mini-chart, and recent activity. Add members by exact username with Add member; remove them with the X on their row, which takes effect immediately.',
        'IT admins can create accounts directly with the Invite user button: fill username, full name, valid email, a 6+ character temporary password, and the role — then share that password with the new user through a secure channel.',
        'Every page resets to the first result set whenever a search or filter changes, and the “Showing X–Y of Z” line always tells you where you are in the list.',
      ],
      shots: [{ src: 'admin-companies.png', caption: 'Directory companies tab with filters' }],
      links: [{ to: '/member-directory', label: 'Member Directory', hint: 'Roster and account controls.' }],
    },
    {
      id: 'a-reports',
      title: 'Review submitted reports',
      icon: ChartUpIcon,
      body: [
        'The Report Summary page opens with three headline numbers: Total reports matching the filters, Approval rate (approved share with the raw counts beneath), and Pending review (submitted, awaiting decision).',
        'Filter by report type (Quarterly, Annual, Good Practices, Success Stories), author gender, and a date preset from All time down to a custom range. Gender here means the report author’s gender; Unspecified covers accounts created before gender capture.',
        'Two charts split the picture: Report creation trend stacks all four types per month over six months, and Reports by type names the largest share in its subtitle. The Review pipeline chart then shows the submitted/approved/rejected split with the approval percentage.',
        'The table lists newest first with created date, title, type, author, and a color-coded status badge. Use it as the reading list after clearing the Approvals queue.',
      ],
      shots: [{ src: 'admin-summary.png', caption: 'Report summary with review pipeline' }],
      links: [{ to: '/reports-summary', label: 'Report Summary', hint: 'Review queues and trends.' }],
    },
    {
      id: 'a-performance',
      title: 'Approve activities, watch KPIs',
      icon: BarChartIcon,
      body: [
        'The Performance page separates signal from context on purpose. The top group — Key outcomes, approved activities only — holds the five requested KPIs: International responses, Youth reached (sum of youth counts), Technical assistance, Trained via F2F (sum of trained counts), and Collaborations. Below, Context cards carry Active members, the SkillsBuild proxy (certificates issued, explicitly labeled a proxy rather than true enrollment), Reports in date range, and Activities logged.',
        'Filter the log by date preset, activity type, target audience (live values from logged entries plus the six fixed audiences), and review status. The Review pipeline subtitle states the approved share and how many entries are decided; the Approved momentum chart plots approved entries per month for six months — the visual proof your approvals move.',
        'The Activity log table sorts newest first and shows date, title, activity, audience, youth and trained counts, and status. Admins get a Review column with inline Approve and Reject buttons per submitted row, no page change needed. The Log activity button opens the same entry form members use, so you can record secretariat-run events yourself.',
        'Only approved entries feed the KPI cards — the page footnote says so, and the approved-only filter is what the headline numbers are built from.',
      ],
      shots: [{ src: 'admin-performance.png', caption: 'Performance KPIs and review pipeline' }],
      links: [{ to: '/reports-performance', label: 'Performance and Metrics', hint: 'KPIs and activity review.' }],
    },
    {
      id: 'a-support',
      title: 'Clear the support queue',
      icon: HelpCircleIcon,
      body: [
        'Open tickets appear in two places: the topbar bell (with a count badge, alongside submitted reports and activities) and the Support page queue. Both link each item straight to its screen.',
        'Each ticket carries a title, a category (Report submission, Knowledge Products, Membership, SkillsBuild, Account access, or Other), and a priority of Low, Medium, or High. Work the queue by status: Open to In progress while you investigate, then Resolved — members see every change immediately.',
        'Reply inside the ticket thread so the whole history stays in one place. Resolve only when the member’s issue is actually fixed; a resolved ticket drops out of everyone’s bell.',
        'The Governance section adds a Support Monitoring analytics page: open/in-progress/resolved counts, average days to resolve, breakdowns by category and priority, and the oldest-first open backlog — read-only, triage still happens here.',
      ],
      shots: [{ src: 'admin-support.png', caption: 'Support ticket queue' }],
      links: [{ to: '/support', label: 'Support', hint: 'Answer member tickets.' }],
    },
    {
      id: 'a-help',
      title: 'Get help',
      icon: File02Icon,
      body: [
        'This manual, the privacy policy, and support live in the Help Center section of the sidebar — the same three destinations for every role.',
        'The lightning icon in the topbar replays the seven-step admin guided tour anytime.',
        'The info icon opens the About box with your signed-in role and the Powered-by row naming the platform partners.',
      ],
      shots: [],
      links: [{ to: '/privacy-policy', label: 'Privacy Policy', hint: 'How personal data is handled.' }],
    },
  ],
};

// Secretariat works the same ops queue as IT admin; the analyst guide is read-only.
MANUAL[ROLE.SECRETARIAT] = MANUAL[ROLE.IT_ADMIN];
MANUAL[ROLE.DATA_ANALYST] = [
  {
    id: 'd-read',
    title: 'Read, don’t submit',
    icon: File02Icon,
    body: [
      'Analysts have read-only access to approved content: knowledge products (approved only), reports, report summary, performance metrics, activities, certificates, and support tickets. Submission pages, uploads, membership actions, membership analytics, and the Secretariat Overview are hidden.',
      'Use Knowledge Products (search + category filter), Report Summary (type/gender/date filters), Membership analytics, and Performance (approved-only KPIs) as the reading list. The Support page is available for filing and tracking your own tickets.',
    ],
    shots: [],
    links: [
      { to: '/knowledge-products', label: 'Knowledge Products', hint: 'Browse shared documents.' },
      { to: '/reports-summary', label: 'Report Summary', hint: 'Read submitted reports.' },
    ],
  },
];

export function UserManual() {
  const viewerRole = effectiveRole(getTokenRoles());
  // Strict per-role manual: no tab switching, viewer sees only their own guide.
  const role = MANUAL[viewerRole] ? viewerRole : ROLE.MEMBER;
  const sections = MANUAL[role];
  const [activeId, setActiveId] = useState(sections[0].id);

  useEffect(() => {
    setActiveId(sections[0].id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div className="flex flex-col gap-0 pb-8">
      <PageHero
        title="User Manual"
        subtitle="How to use the ARISE Philippines knowledge platform, step by step."
        bg="/manual.jpg"
        overlayClassName="bg-[#0a1931]/60"
        className="rounded-none"
      />
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 lg:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="sticky top-16 hidden w-60 shrink-0 self-start border-r pr-4 md:block">
            <div className="mb-4 flex items-center gap-2 px-2 text-sm font-medium">
              <HugeiconsIcon icon={BookOpen01Icon} size={16} strokeWidth={1.8} />
              Table of contents
            </div>
            <ol className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={activeId === s.id ? 'true' : undefined}
                    onClick={() => setActiveId(s.id)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      activeId === s.id
                        ? 'bg-[var(--sendai-teal)] font-semibold text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <HugeiconsIcon icon={s.icon} size={16} strokeWidth={1.8} className="shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
          <Card className="min-w-0 flex-1">
            <CardContent className="divide-y divide-border p-0">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-20 p-5">
                  <div className="flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--sendai-teal)] text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-heading text-base font-bold text-[#1e3a5f]">{s.title}</h2>
                      {s.body.map((p, j) => (
                        <p key={j} className="mt-2 text-justify text-sm leading-relaxed text-muted-foreground">
                          {p}
                        </p>
                      ))}
                      <Shot shots={s.shots} />
                      {s.links.length > 0 && (
                        <ul className="mt-3 space-y-2">
                          {s.links.map((l) => (
                            <li key={l.to}>
                              <Link
                                to={l.to}
                                className={cn('text-sm font-semibold text-[#0B4484] hover:text-[var(--sendai-teal)]')}
                              >
                                {l.label}
                              </Link>
                              <span className="text-sm text-muted-foreground"> — {l.hint}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
