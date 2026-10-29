import { PageHero } from '@/components/PageHero.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';

// TODO: replace every section below with the official ARISE Philippines
// privacy policy copy. Structure and headings mirror arise.ph; body text is
// a placeholder draft for layout only — do not treat as legal copy.
const SECTIONS = [
  { id: 'privacy-statement', title: 'Privacy Statement', body: 'ARISE Philippines collects and processes personal data in connection with its services, events, platforms, and member interactions. This policy explains what is collected, why, and the rights available to every data subject.' },
  { id: 'collection', title: 'Collection of Personal Data', body: 'Personal data is collected directly when you attend events, register, answer surveys, apply for membership, or contact ARISE Philippines. This may include name, age, nationality, civil status, mailing address, email address, and phone number.' },
  { id: 'use', title: 'Use and Processing of Personal Data', body: 'Collected data is used to provide and improve services, process membership applications, publish member announcements where consent was given, and communicate programs and activities.' },
  { id: 'sharing', title: 'Sharing of Personal Data', body: 'Data may be shared between and among member companies, the UNDRR ARISE network, and service providers that need it to carry out work on behalf of ARISE Philippines, in accordance with applicable law.' },
  { id: 'storage', title: 'Storage and Protection of Personal Data', body: 'Reasonable organizational, physical, and technical safeguards protect collected data. Access is limited to authorized personnel bound by confidentiality obligations.' },
  { id: 'cookies', title: 'Use of Cookies', body: 'The website uses cookies to recognize browsers, remember preferences, and compile aggregate traffic data. You may disable cookies in browser settings, though some features may not function properly.' },
  { id: 'responsibility', title: 'User Responsibility', body: 'Users are encouraged to keep browsers up to date, safeguard their own credentials, and review third-party privacy policies before sharing personal data elsewhere.' },
  { id: 'rights', title: 'Your Rights under the Data Privacy Act', body: 'Under Republic Act No. 10173 you have the right to be informed, to object, to access, to rectify, to suspend or withdraw, to data portability, and to damages — exercisable through the Data Protection Officer.' },
  { id: 'changes', title: 'Changes to the Privacy Policy', body: 'ARISE Philippines may update this policy from time to time. Material changes will be communicated, and continued use of the services constitutes acceptance.' },
  { id: 'contact', title: 'Contacting Us', body: 'Questions about this policy may be directed to the Data Protection Officer at dpo@arise.ph.' },
  { id: 'consent', title: 'Consent', body: 'By using ARISE Philippines services you consent to the collection, use, and processing of your personal data as described in this policy.' },
];

export function PrivacyPolicy() {
  return (
    <div>
      <PageHero
        title="Privacy Policy"
        subtitle="How ARISE Philippines collects, uses, stores, and protects personal data."
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:px-6">
        <aside className="w-full shrink-0 lg:w-60">
          <Card className="lg:sticky lg:top-20">
            <CardContent className="p-4">
              <p className="editorial-label mb-3 text-[#1e3a5f]">Contents</p>
              <ol className="space-y-1">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-[#e9f7ef] hover:text-[#15803d]"
                    >
                      <span className="w-5 shrink-0 tabular-nums">{i + 1}</span>
                      <span className="truncate">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          {SECTIONS.map((s, i) => (
            <Card key={s.id} id={s.id} className="scroll-mt-20">
              <CardContent className="flex gap-4 p-5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--sendai-teal)] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-heading text-base font-bold text-[#1e3a5f]">{s.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
