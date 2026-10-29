import { PageHero } from '@/components/PageHero.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

const SECTIONS = [
  {
    id: 'privacy-statement',
    title: 'Privacy Statement',
    body: [
      'ARISE – Philippines is a local network of ARISE, the Private Sector Alliance for Disaster Resilient Societies which is led by the United Nations Office for Disaster Risk Reduction (UNDRR). ARISE – Philippines has member companies all over the Philippines.',
      'ARISE – Philippines collects, processes and stores personal data about you when you avail of its products and services, including its websites and mobile applications, participate in its events, submit your membership application, answer surveys, and/or enter into any contract of service provided that you have given your express consent. This may likewise happen when you click on the links in the website of ARISE – Philippines leading to the websites of its individual member companies.',
      'This privacy policy has been prepared to better serve any person who avails of the Services of ARISE – Philippines to inform them on how their personal data are being collected, used and secured by ARISE – Philippines. Privacy Policies of its individual members are distinct and separate from that of ARISE – Philippines.',
      'Please read our privacy policy carefully to get a clear understanding of how ARISE – Philippines collects, uses, protects or otherwise handles your personal data in accordance with Republic Act No. 10173, or the Data Privacy Act of 2012, and its Implementing Rules and Regulations (collectively, the “Data Privacy Act”). Additional information on the ARISE – Philippines Privacy Policy shall be provided at the ARISE – Philippines website.',
    ],
  },
  {
    id: 'collection',
    title: 'Collection of Personal Data',
    body: [
      'ARISE – Philippines collects information you provide directly to it, such as when you attend or participate in any of its events, respond to a survey, register, create or modify your accounts in its website and/or mobile applications, contact the secretariat, submit your membership application, enter into any contract with them or otherwise communicate or interact with ARISE – Philippines.',
      'The following personal data may be collected: your name, age, nationality, civil status, mailing address, email address, phone number, or other details to help you with your experience.',
    ],
  },
  {
    id: 'use',
    title: 'Use and Processing of Personal Data',
    body: [
      'ARISE – Philippines may use and process the personal data collected about you to allow you to avail of the Services and/or to participate in its events and activities to be provided by or held by ARISE – Philippines. These may include but are not limited to the processing of your membership application, publication of your name and/or picture should you become a member and/or participate in its activities, press releases, advertisements, reports, and official communications of ARISE – Philippines and its member companies and its affiliated networks. At all times, your personal data shall not be used or processed for any purpose that is contrary to law, morals, or public policy.',
    ],
  },
  {
    id: 'sharing',
    title: 'Sharing of Personal Data',
    body: [
      'ARISE – Philippines may share personal data between and among its member companies, other networks of ARISE and the United Nations Office for Disaster Risk Reduction (UNDRR). ARISE – Philippines may also share personal data with vendors, consultants, marketing partners, and other service providers who need access to such information to carry out work on behalf of ARISE – Philippines. If and when it becomes necessary, a data sharing agreement shall cover any sharing of data between and among ARISE – Philippines and/or its vendors, consultants, marketing partners, and other service providers. ARISE – Philippines may also share information in accordance with any order from any relevant government agency as provided by law.',
    ],
  },
  {
    id: 'storage',
    title: 'Storage and Protection of Personal Data',
    body: [
      'ARISE – Philippines has instituted policies and procedures which intend to protect personal data which it has collected and continues to collect. These include securing any document containing personal data, requiring the execution of non-disclosure agreements by its employees, consultants, vendors, suppliers and contractors, among others.',
      'ARISE – Philippines’ website is scanned on a regular basis for security holes and known vulnerabilities in order to make your visit to said website as safe as possible. Your personal data is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the personal data confidential. ARISE – Philippines implements a variety of security measures when a user logs in to the website, submits, or accesses information to maintain the safety of your personal information. All transactions are processed through a gateway provider and are not stored or processed on our servers.',
      'While there will always be a risk of unauthorized disclosure of personal data, ARISE – Philippines believes that the foregoing safeguards are sufficient to prevent the occurrence of such risk and is committed to updating and improving such safeguards in order to protect your personal data in compliance with the Data Privacy Act.',
    ],
  },
  {
    id: 'cookies',
    title: 'Use of Cookies',
    body: [
      'Please note that in visiting the ARISE – Philippines website, cookies are utilized. Cookies are small files that a site or its service provider transfers to your computer’s hard drive through your web browser (if you allow) that enables the site’s or service provider’s systems to recognize your browser and capture and remember certain information. For instance, ARISE – Philippines uses cookies to help us understand your preferences based on previous or current site activity, which enables us to provide you with improved Services. ARISE – Philippines also uses cookies to help it compile aggregate data about site traffic and site interaction so that ARISE – Philippines can offer better site experiences and tools in the future.',
      'You can choose to have your computer warn you each time a cookie is being sent, or you can choose to turn off all cookies. You do this through your browser settings. Since browsers are a little different, look at your browser’s Help Menu to learn the correct way to modify your cookies. If you turn cookies off, some features will be disabled. Some of the features that make your site experience more efficient may not function properly.',
    ],
  },
  {
    id: 'responsibility',
    title: 'User Responsibility',
    body: [
      'While we employ all necessary precautions to safeguard your information, we cannot warrant 100% cyber security. ARISE – Philippines encourages you to use the latest version of web browsers. The most important reason to keep your browser up to date is for your own safety and security. Updated web browsers are normally equipped with security features that provide anti-phishing protection, improved parental controls and tools to prevent malware and other privacy threats.',
      'Our website may also contain hyperlinks to third-party websites that are not owned or controlled by ARISE – Philippines. The links to third-party websites are provided for your convenience and information only. ARISE – Philippines advises you to read and study the privacy policy of third-party websites to determine how they handle and protect information they collect from you.',
    ],
  },
  {
    id: 'rights',
    title: 'Your Rights under the Data Privacy Act',
    body: ['As a data subject, you have the following rights under the Data Privacy Act:'],
    points: [
      'You have the right to be informed of the collection and processing of your personal data, the purpose for which they will be processed, among others. Thus, you are required to read this privacy policy before giving your consent to the collection and processing of your personal data. If you have questions, please do not hesitate to ask us questions or clarifications and you may also contact our Data Protection Officer;',
      'You have the right to object to the processing of your personal data. You will be given an option or opportunity to withhold your consent to the processing of your personal data whenever ARISE – Philippines communicates with you or by notifying our Data Protection Officer;',
      'You have the right to have reasonable access to your personal data by notifying our Data Protection Officer;',
      'You have the right to rectify or correct any inaccuracy or error in your personal data by submitting your request for rectification or correction to our Data Protection Officer;',
      'You have the right to suspend, withdraw or order the blocking, removal or destruction of your personal data in accordance with the requirements of the Data Privacy Act. Please notify our Data Protection Officer if you wish to exercise this right;',
      'You have the right to obtain a copy of your data in an electronic or structured format if the same is processed by electronic means and in a structured and commonly used format by submitting your request to our Data Protection Officer; and',
      'You have the right to be indemnified if you incur damages due to inaccurate, incomplete, outdated, false, unlawfully obtained or unauthorized use of your personal data.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to the Privacy Policy',
    body: [
      'ARISE – Philippines may change this Privacy Policy from time to time. If ARISE – Philippines makes any significant change in the collection, use, and protection of personal data, ARISE – Philippines will provide you notice through the Services or by some other means, such as email. It is encouraged that you periodically review the Privacy Policy in the ARISE – Philippines website for the latest information.',
    ],
  },
  {
    id: 'contact',
    title: 'Contacting Us',
    body: [
      'If there are any questions regarding this privacy policy, you may contact our Data Protection Officer with the following contact details:',
    ],
    points: [
      'Title/Designation: Data Protection Officer',
      'Postal Address: 10/F Mall of Asia Arena Annex Building, Coral Way corner J.W. Diokno Boulevard, Mall of Asia Complex, Pasay City, 1300 Philippines',
      'Telephone Number: (02) 88627051',
      'Email Address: dpo@arise.ph',
    ],
  },
  {
    id: 'consent',
    title: 'Consent',
    body: [
      'We will secure your consent prior to the collection and processing of your personal data, or as soon as practicable and reasonable in order to ensure continuation of the Services. Before you give your consent, you will be provided with an opportunity to read and review this Privacy Policy.',
      'If you consent to the collection and processing of your personal data in accordance with the Privacy Policy, such consent shall be valid for a period of ten (10) years from the date such consent was given or such longer period as may be required by applicable law or when necessary as provided by the Data Privacy Act, or unless you have expressly withdrawn such consent.',
      'By signing the accompanying sign-up sheet or ticking the “Agree” button if your personal data was collected manually or electronically, respectively, you are expressly giving your consent to the collection, processing and storage of your personal data as provided herein.',
    ],
  },
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
                <div className="min-w-0">
                  <h2 className="font-heading text-base font-bold text-[#1e3a5f]">{s.title}</h2>
                  {s.body.map((p, j) => (
                    <p key={j} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p}
                    </p>
                  ))}
                  {s.points && (
                    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                      {s.points.map((pt, k) => (
                        <li key={k}>{pt}</li>
                      ))}
                    </ol>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
