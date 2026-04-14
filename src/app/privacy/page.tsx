import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Fraunces, DM_Sans } from 'next/font/google';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['300', '400', '500'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500'] });

export default function PrivacyPage() {
    return (
        <div className={`min-h-screen bg-[#faf8f4] text-[#0f0e0d] flex flex-col ${dmSans.className} text-[15px] leading-relaxed font-light antialiased`}>
            <Navbar />
            
            {/* Hero Section */}
            <div className="bg-[#0f0e0d] text-[#faf8f4] relative overflow-hidden px-6 md:px-20 py-16 md:py-24">
                {/* Decorative Circles */}
                <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-orange-500/20 pointer-events-none" />
                <div className="absolute -top-5 -right-5 w-52 h-52 rounded-full border border-orange-500/10 pointer-events-none" />
                
                <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-orange-500 mb-4">
                    Legal Documentation
                </div>
                
                <h1 className={`${fraunces.className} text-4xl md:text-7xl font-light leading-[1.05] tracking-[-0.03em] max-w-2xl mb-6`}>
                    Privacy Policy
                </h1>
                
                <div className="flex flex-wrap gap-6 text-[13px] text-[#7a746c]">
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Last updated April 2026</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Sierra Leone</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> eventa.africa</span>
                </div>
            </div>

            <main className="max-w-[900px] mx-auto w-full px-6 md:px-20 py-12 md:py-20">
                
                {/* Intro */}
                <p className="mb-10 text-[15px] text-[#7a746c] max-w-[680px] leading-[1.8]">
                    Eventa respects your privacy. This Privacy Policy explains what personal information we collect, why we collect it, how we use and protect it, and what rights you have over it. By using the Eventa platform, you confirm that you have read and understood this policy and consent to the use of your information as described below.
                </p>

                {/* TOC */}
                <div className="bg-[#f3f0ea] border-l-[3px] border-orange-500 p-7 md:p-8 mb-14">
                    <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#7a746c] mb-4">Contents</div>
                    <ol className="list-none columns-1 sm:columns-2 gap-8 text-[13.5px]">
                        {[
                            'Who We Are', 'Information We Collect', 'How We Use Your Information', 
                            'Legal Basis for Processing', 'Sharing Your Information', 'Cookies and Tracking', 
                            'Data Retention', 'Security', 'Your Rights', "Children's Privacy", 
                            'Third-Party Links', 'Data Protection Principles', 'Managing Your Information', 'Governing Law'
                        ].map((title, i) => (
                            <li key={i} className="mb-1.5 break-inside-avoid">
                                <a href={`#s${i + 1}`} className="flex items-baseline gap-2 text-[#0f0e0d] hover:text-orange-500 transition-colors">
                                    <span className={`${fraunces.className} text-[11px] text-orange-500 min-w-[20px] font-light`}>
                                        {(i + 1).toString().padStart(2, '0')}
                                    </span>
                                    {title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>

                {/* Section 1: Who We Are */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s1">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>01</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Who We Are</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">The Platform is owned and operated by Eventa, trading as eventa.africa and registered in Sierra Leone. Throughout this policy, "Eventa", "we", "us", and "our" refer to the company described below. "You" and "your" refer to any person who accesses or uses the Platform.</p>
                    <table className="w-full border-collapse my-5 text-[13.5px]">
                        <tbody>
                            {[
                                ['Company Name', '[Registered company name — to be inserted]'],
                                ['Registration No.', '[Registration number — to be inserted]'],
                                ['Registered Address', '[Registered office address, Sierra Leone — to be inserted]'],
                                ['Contact', 'Via WhatsApp at the number displayed on the Platform']
                            ].map(([label, val], idx) => (
                                <tr key={idx} className="border-b border-[#e0dbd3] last:border-b-0">
                                    <td className="py-3 pr-6 align-top font-medium text-[#7a746c] w-[200px] text-[12px] tracking-[0.04em] uppercase">{label}</td>
                                    <td className="py-3 align-top">{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Section 2: Information We Collect */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s2">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>02</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Information We Collect</h2>
                    </div>

                    <div className="space-y-6">
                        {[
                            { title: "Information you give us directly", desc: "When you register a User Profile, purchase a ticket, list an event, or contact us for support, you may provide personal information including your name, phone number, email address, and WhatsApp number. You are under no obligation to provide this information, but without it certain features may not be available." },
                            { title: "Payment information", desc: "Payments are processed via Orange Money and Afrimoney. Eventa does not store your mobile money credentials, PIN, or full account details. Payment data is handled directly by the relevant mobile money provider — please review their privacy policy." },
                            { title: "Automatically collected information", desc: "When you access the Platform, our servers may automatically collect technical information such as your IP address, device type, browser type, operating system, access times, and pages visited. This is used to maintain and improve the Platform and is not used to identify you personally without your consent." },
                            { title: "Mobile device information", desc: "If you access the Platform from a mobile device, we may collect information about that device, including its model, operating system, and unique device identifier, to the extent necessary to deliver the Services." },
                            { title: "Information from third parties", desc: "If you connect your account to a third-party service, we may receive information from that third party to the extent permitted by your settings and their privacy policy." }
                        ].map((sub, idx) => (
                            <div key={idx} className="my-6">
                                <h3 className={`${fraunces.className} text-[15px] font-normal text-[#0f0e0d] mb-2.5 flex items-center gap-2`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                    {sub.title}
                                </h3>
                                <p className="text-[#3a3733]">{sub.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3: How We Use Your Information */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s3">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>03</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>How We Use Your Information</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">We use the information we collect to operate and improve the Platform and to provide the Services. Specifically, we may use your information to:</p>
                    <ul className="list-none space-y-0 text-[#3a3733]">
                        {[
                            'Create and manage your User Profile or ticket purchase.',
                            'Deliver your ticket to your WhatsApp number after a confirmed payment.',
                            'Process payments and, where applicable, issue refunds in accordance with our Refund Policy.',
                            'Send you confirmations, receipts, and support communications via WhatsApp, SMS, or email.',
                            'Notify you of changes to events you have purchased tickets for, or to the Platform.',
                            'Detect and prevent fraud, unauthorised access, and other prohibited activities.',
                            'Analyse usage patterns to improve the performance and features of the Platform.',
                            'Comply with our legal and regulatory obligations under the laws of Sierra Leone.',
                            'Respond to your enquiries and resolve disputes.'
                        ].map((item, idx) => (
                            <li key={idx} className="relative py-2.5 pl-5 border-b border-[#e0dbd3] last:border-b-0 text-[14px] leading-[1.65]">
                                <span className="absolute left-0 top-[12px] text-orange-500 text-[12px]">→</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-[#3a3733]">We will not use your personal information for a purpose materially different from those listed above without first obtaining your consent.</p>
                </div>

                {/* Section 4: Legal Basis */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s4">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>04</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Legal Basis for Processing</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">We process your personal information on one or more of the following lawful grounds:</p>
                    <ul className="list-none space-y-0 text-[#3a3733]">
                        {[
                            { t: 'Contract', d: 'Processing is necessary to deliver the Services you have requested, including ticket purchase and delivery.' },
                            { t: 'Consent', d: 'Where we rely on your consent, you may withdraw it at any time by contacting us via WhatsApp. Withdrawal does not affect the lawfulness of any prior processing.' },
                            { t: 'Legal obligation', d: 'We may process your data where required to do so by applicable law in Sierra Leone.' },
                            { t: 'Legitimate interest', d: 'We may process your data to operate, maintain, and improve the Platform, provided this does not override your rights and interests.' }
                        ].map((item, idx) => (
                            <li key={idx} className="relative py-2.5 pl-5 border-b border-[#e0dbd3] last:border-b-0 text-[14px] leading-[1.65]">
                                <span className="absolute left-0 top-[12px] text-orange-500 text-[12px]">→</span>
                                <strong className="text-[#0f0e0d]">{item.t}:</strong> {item.d}
                            </li>
                        ))}
                    </ul>
                    <p className="mt-4 text-[#3a3733]">In the event of a business reorganisation, merger, or asset transfer, your personal data may be transferred to a successor entity. We will notify you before any such transfer and ensure adequate protections are in place.</p>
                </div>

                {/* Section 5: Sharing Info */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s5">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>05</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Sharing Your Information</h2>
                    </div>
                    <p className="mb-6 text-[#3a3733]">We do not sell your personal information. We may share your information only in the following circumstances:</p>
                    <div className="space-y-6">
                        {[
                            { title: "Payment processors", desc: "We share transaction data with Orange Money and Afrimoney to the extent necessary to process your payment. These providers handle your data under their own privacy policies." },
                            { title: "Event Organisers", desc: "When you purchase a ticket, your name and contact details may be shared with the relevant Event Organiser solely for the purpose of event management and access verification." },
                            { title: "Service providers", desc: "We may share data with trusted third-party providers who assist us in operating the Platform (such as hosting and analytics providers). These providers are required to process your data only in accordance with our instructions and this policy." },
                            { title: "Legal requirements", desc: "We may disclose your information where required or permitted by law, including to comply with a court order, regulatory requirement, or to protect the rights, safety, or property of Eventa, its users, or the public." }
                        ].map((sub, idx) => (
                            <div key={idx} className="my-6">
                                <h3 className={`${fraunces.className} text-[15px] font-normal text-[#0f0e0d] mb-2.5 flex items-center gap-2`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                    {sub.title}
                                </h3>
                                <p className="text-[#3a3733]">{sub.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sections 6-8 */}
                {[
                    { title: "Cookies and Tracking", content: ["The Platform may use cookies and similar technologies to recognise your browser or device, remember your preferences, and analyse how the Platform is used. Cookies do not collect personally identifiable information unless you have provided it to us.", "Most browsers accept cookies by default. You may configure your browser to refuse cookies, but doing so may affect the availability or functionality of certain features. We may also use third-party analytics tools (such as Google Analytics) that place their own cookies on your device in accordance with their own privacy policies."] },
                    { title: "Data Retention", content: ["We retain your personal information only for as long as is necessary to fulfil the purposes for which it was collected, including to provide the Services, resolve disputes, and comply with our legal obligations.", "In general, we retain personal data for a maximum of seven (7) years after your last transaction or the closure of your account, unless a longer period is required by law.", "Upon your written request, we will delete your personal data from our active systems, unless we are required by law to retain it or it is necessary to protect our legitimate interests."] },
                    { title: "Security of Your Information", content: ["We take reasonable administrative, technical, and organisational measures to protect your personal information from unauthorised access, loss, misuse, or disclosure. However, no method of electronic transmission or storage is completely secure. While we strive to protect your data, we cannot guarantee absolute security, and you use the Platform at your own risk.", "You are responsible for keeping your account credentials confidential. If you believe your account has been compromised, contact us immediately via WhatsApp."] }
                ].map((sec, idx) => (
                    <div key={idx} className="mb-14 pt-2 border-t border-[#e0dbd3]" id={`s${idx + 6}`}>
                        <div className="flex items-baseline gap-4 mb-5 pt-6">
                            <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>{(idx + 6).toString().padStart(2, '0')}</span>
                            <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>{sec.title}</h2>
                        </div>
                        <div className="space-y-4 text-[#3a3733]">
                            {sec.content.map((p, pidx) => <p key={pidx}>{p}</p>)}
                        </div>
                    </div>
                ))}

                {/* Section 9: Your Rights */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s9">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>09</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Your Rights</h2>
                    </div>
                    <p className="mb-6 text-[#3a3733]">Subject to applicable law, you have the following rights in relation to your personal information:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[1px] bg-[#e0dbd3] border border-[#e0dbd3] my-6">
                        {[
                            { n: '01', t: 'Access', d: 'Request a copy of the personal information we hold about you.' },
                            { n: '02', t: 'Correction', d: 'Request that we correct any inaccurate or incomplete information.' },
                            { n: '03', t: 'Deletion', d: 'Request deletion where data is no longer necessary or processing is unlawful.' },
                            { n: '04', t: 'Objection', d: 'Object to our processing where we rely on legitimate interest.' },
                            { n: '05', t: 'Restriction', d: 'Request that we restrict processing in certain circumstances.' },
                            { n: '06', t: 'Portability', d: 'Request your data in a structured, commonly used format.' },
                            { n: '07', t: 'Withdrawal', d: 'Withdraw consent at any time without affecting prior processing.' },
                            { n: '08', t: 'Complaint', d: 'Lodge a complaint with the relevant data protection authority in Sierra Leone.' }
                        ].map((right, idx) => (
                            <div key={idx} className="bg-[#faf8f4] p-5">
                                <div className={`${fraunces.className} text-2xl font-light text-orange-100 leading-none mb-2`}>{right.n}</div>
                                <div className="font-medium text-[13px] text-[#0f0e0d] mb-1.5">{right.t}</div>
                                <div className="text-[12.5px] text-[#7a746c] leading-[1.6]">{right.d}</div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[#3a3733]">To exercise any of these rights, contact us via WhatsApp. We may request identification to verify that you are the owner of the data before taking any action.</p>
                </div>

                {/* Section 10 & 11 */}
                {[
                    { title: "Children's Privacy", content: ["The Platform is not directed at children under the age of 18, and we do not knowingly collect personal information from anyone under 18. If you believe we have inadvertently collected information from a child, please contact us immediately via WhatsApp and we will take steps to delete it promptly."] },
                    { title: "Third-Party Links and Services", content: ["The Platform may contain links to third-party websites or services not operated by Eventa. Once you leave the Platform, this Privacy Policy no longer applies. We have no control over and accept no responsibility for the privacy practices or content of third-party sites. We encourage you to review the privacy policy of any third-party service before providing them with your information."] }
                ].map((sec, idx) => (
                    <div key={idx} className="mb-14 pt-2 border-t border-[#e0dbd3]" id={`s${idx + 10}`}>
                        <div className="flex items-baseline gap-4 mb-5 pt-6">
                            <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>{(idx + 10).toString().padStart(2, '0')}</span>
                            <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>{sec.title}</h2>
                        </div>
                        <div className="space-y-4 text-[#3a3733]">
                            {sec.content.map((p, pidx) => <p key={pidx}>{p}</p>)}
                        </div>
                    </div>
                ))}

                {/* Section 12: Principles */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s12">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>12</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Data Protection Principles</h2>
                    </div>
                    <p className="text-[#3a3733]">In all our processing of personal data, we are guided by the following principles. Personal data must be:</p>
                    <div className="bg-[#f3f0ea] p-6 md:px-8 my-5 divide-y divide-[#e0dbd3]">
                        {[
                            'Processed lawfully, fairly, and transparently, with respect for the dignity of the individual.',
                            'Collected for specified, explicit, and legitimate purposes and not processed in a way incompatible with those purposes.',
                            'Adequate, relevant, and limited to what is necessary for the purpose of processing.',
                            'Accurate and kept up to date where necessary.',
                            'Not retained in identifiable form for longer than is necessary.',
                            'Processed securely, using appropriate technical and organisational measures to guard against unauthorised access, loss, or destruction.'
                        ].map((princ, idx) => (
                            <div key={idx} className="flex gap-3 py-3 first:pt-0 last:pb-0 text-[14px] text-[#3a3733]">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                                <div>{princ}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 13: Managing Info */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s13">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>13</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Managing Your Information</h2>
                    </div>
                    <div className="space-y-6">
                        <div className="my-6">
                            <h3 className={`${fraunces.className} text-[15px] font-normal text-[#0f0e0d] mb-2.5 flex items-center gap-2`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                Updating your account
                            </h3>
                            <p className="text-[#3a3733]">If you hold a User Profile, you may update your personal information at any time through your account settings or by contacting us via WhatsApp. You may also request deletion of your account at any time. Upon deletion, your account and associated data will be removed from our active systems, subject to any legal retention obligations.</p>
                        </div>
                        <div className="my-6">
                            <h3 className={`${fraunces.className} text-[15px] font-normal text-[#0f0e0d] mb-2.5 flex items-center gap-2`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                Communications preferences
                            </h3>
                            <p className="text-[#3a3733]">If you no longer wish to receive promotional communications from Eventa, you may opt out by contacting us via WhatsApp. Please note that transactional communications (such as ticket confirmations and refund notifications) are necessary to deliver the Services and cannot be opted out of while your account is active.</p>
                        </div>
                    </div>
                </div>

                {/* Section 14: Governing Law */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s14">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>14</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Governing Law</h2>
                    </div>
                    <p className="text-[#3a3733]">This Privacy Policy is governed by and construed in accordance with the laws of Sierra Leone. Any dispute arising out of or in connection with this policy shall be subject to the exclusive jurisdiction of the courts of Sierra Leone.</p>
                    <p className="mt-4 text-[#3a3733]">If you have any questions about this Privacy Policy or how we handle your personal information, please contact us via WhatsApp at the number displayed on the Platform. We are committed to addressing your concerns promptly and transparently.</p>
                </div>

            </main>

            <footer className="bg-[#0f0e0d] text-[#7a746c] px-6 md:px-20 py-8 text-[12px] flex justify-between items-center flex-wrap gap-3 border-t-2 border-orange-500 mt-auto">
                <span>Last updated: April 2026 · Eventa is operated in Sierra Leone</span>
                <div className="flex gap-5 flex-wrap">
                    <a href="/terms" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Terms &amp; Conditions</a>
                    <a href="/refunds" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Refund Policy</a>
                    <a href="#" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Contact via WhatsApp</a>
                </div>
            </footer>
        </div>
    );
}
