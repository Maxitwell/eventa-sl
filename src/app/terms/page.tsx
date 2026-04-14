import React from 'react';
import { Fraunces, DM_Sans } from 'next/font/google';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['300', '400', '500'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500'] });

export default function TermsPage() {
    return (
        <div className={`min-h-screen bg-[#faf8f4] text-[#0f0e0d] flex flex-col ${dmSans.className} text-[15px] leading-relaxed font-light antialiased pt-1`}>
            {/* Hero Section */}
            <div className="bg-[#0f0e0d] text-[#faf8f4] relative overflow-hidden px-6 md:px-20 py-16 md:py-24">
                <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-orange-500/20 pointer-events-none" />
                
                <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-orange-500 mb-4">
                    Legal Documentation
                </div>
                
                <h1 className={`${fraunces.className} text-4xl md:text-7xl font-light leading-[1.05] tracking-[-0.03em] max-w-2xl mb-4`}>
                    Terms &amp; Conditions
                </h1>
                
                <p className="text-[#a09890] max-w-2xl text-[15px] leading-[1.7] mb-6">
                    Please read these Terms and Conditions carefully before using the Eventa platform. By registering, accessing, or using the Platform in any way, you confirm that you have read, understood, and agreed to be bound by these Terms.
                </p>
                
                <div className="flex flex-wrap gap-6 text-[13px] text-[#7a746c]">
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Last updated April 2026</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Sierra Leone</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> eventa.africa</span>
                </div>
            </div>

            <main className="max-w-[900px] mx-auto w-full px-6 md:px-20 py-12 md:py-20">
                
                {/* TOC */}
                <div className="bg-[#f3f0ea] border-l-[3px] border-orange-500 p-7 md:p-8 mb-14">
                    <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#7a746c] mb-4">Contents</div>
                    <ol className="list-none columns-1 sm:columns-2 gap-8 text-[13.5px]">
                        {['Who We Are', 'Definitions', 'Purpose and Acceptance', 'Event Organisers', 'Ticket Purchases', 'Prohibited Uses', 'Payments and Fees', 'Intellectual Property', 'Communications', 'Personal Data and Privacy', 'Platform Availability', 'Third-Party Services', 'Limitation of Liability', 'Disclaimer of Warranties', 'Indemnification', 'Representations and Warranties', 'Termination', 'Severability and General Provisions', 'Governing Law and Dispute Resolution'].map((title, i) => (
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

                {/* Section 1 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s1">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>01</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Who We Are</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">The Eventa platform (the "Platform") is owned and operated by Eventa, trading in Sierra Leone as eventa.africa. Throughout these Terms, "Eventa", "we", "us", and "our" refer to the company described below. "You" and "your" refer to the person or entity using or accessing the Platform.</p>
                    <table className="w-full border-collapse my-5 text-[13.5px]">
                        <tbody>
                            {[
                                ['Company Name', '[Registered company name — to be inserted]'],
                                ['Registration No.', '[Registration number — to be inserted]'],
                                ['Registered Address', '[Registered office address, Sierra Leone — to be inserted]'],
                                ['Trading Name', 'Eventa / eventa.africa'],
                                ['Contact', 'Via WhatsApp at the number displayed on the Platform'],
                                ['Operating Country', 'Sierra Leone']
                            ].map(([label, val], idx) => (
                                <tr key={idx} className="border-b border-[#e0dbd3] last:border-b-0">
                                    <td className="py-3 pr-6 align-top font-medium text-[#7a746c] w-[200px] text-[12px] tracking-[0.04em] uppercase">{label}</td>
                                    <td className="py-3 align-top">{val}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-[#3a3733]">We may update these Terms at any time. The current version will always be published on the Platform. Your continued use of the Platform after any update constitutes acceptance of the revised Terms.</p>
                </div>

                {/* Section 2 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s2">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>02</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Definitions</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">In these Terms, the following words have the meanings given below:</p>
                    <div className="my-5">
                        {[
                            ['"Event Attendee"', 'Any person who purchases a ticket through the Platform for the purpose of attending an event.'],
                            ['"Event Organiser"', 'Any person or entity that lists and sells tickets for an event through the Platform.'],
                            ['"Platform"', 'The Eventa website, web application, and all related services accessible at eventa.africa and any associated domains.'],
                            ['"Platform Service Fee"', 'The non-refundable fee retained by Eventa on each ticket transaction, displayed at checkout before payment is completed.'],
                            ['"Services"', 'All products and services offered by Eventa through the Platform, including ticket listing, sales processing, and ticket delivery.'],
                            ['"Terms"', 'These Terms and Conditions, as updated from time to time.'],
                            ['"Ticket"', 'A digital ticket issued via WhatsApp upon successful payment, granting entry to a specific event.'],
                            ['"User Profile"', 'The registered account created by an Event Organiser on the Platform.']
                        ].map(([term, mean], idx) => (
                            <div key={idx} className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3.5 border-b border-[#e0dbd3] last:border-b-0 text-[14px]">
                                <div className="font-medium text-[#0f0e0d] text-[13px] tracking-[0.01em]">{term}</div>
                                <div className="text-[#3a3733] leading-[1.65]">{mean}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 3 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s3">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>03</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Purpose and Acceptance</h2>
                    </div>
                    <div className="space-y-4 text-[#3a3733]">
                        <p>These Terms govern all use of and access to the Platform and the Services. They constitute a binding agreement between you and Eventa.</p>
                        <p>The Platform is intended solely for individuals who are 18 years of age or older. Any access to or use of the Platform by anyone under 18 is unauthorised and in violation of these Terms. By accessing or using the Platform, you confirm that you are 18 years of age or older.</p>
                        <p>By registering, accessing, or using the Platform in any way, you agree to be bound by these Terms and our Refund Policy, both of which are published on the Platform. If you are accepting these Terms on behalf of a company, organisation, or other legal entity, you confirm that you have the authority to bind that entity.</p>
                    </div>
                </div>

                {/* Section 4 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s4">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>04</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Access to the Platform — Event Organisers</h2>
                    </div>
                    <div className="space-y-4 text-[#3a3733]">
                        <p>Event Organisers may register for a User Profile to list events, manage ticket sales, and receive payments through the Platform. Registration is available only to persons who are the authorised promoter, venue operator, or ticketing agent for the relevant event.</p>
                        <p>Eventa is a self-service ticketing platform. We provide the technology that connects Event Organisers with Event Attendees. We are not a party to the contract between an Event Organiser and an Event Attendee, and we do not pre-screen Event Attendees. All contractual responsibility for the event, its terms of sale, and ticket fulfilment rests with the Event Organiser.</p>
                        <p>By registering as an Event Organiser, you agree to:</p>
                        <ul className="list-none my-4 space-y-0">
                            {[
                                'Handle all communication and customer support for your Event Attendees directly, without referring them to Eventa for matters relating to your event.',
                                'Respond to any query received from an Event Attendee within three (3) business days.',
                                'Accept full liability for the contractual relationship between you and your Event Attendees.',
                                'Notify your Event Attendees promptly and update your Eventa event listing if your event is cancelled, postponed, or materially changed from the information given at the time of listing.',
                                'Comply with all applicable laws and regulations in Sierra Leone relating to the organisation and promotion of events and the collection of ticket revenue.',
                                'Provide Eventa with accurate, complete, and up-to-date information about yourself and your events, and update that information promptly if it changes.',
                                'Cooperate with Eventa in all matters relating to your use of the Platform and the Services.'
                            ].map((item, idx) => (
                                <li key={idx} className="relative py-2.5 pl-5 border-b border-[#e0dbd3] last:border-b-0 text-[14px] leading-[1.65]">
                                    <span className="absolute left-0 top-[12px] text-orange-500 text-[12px]">→</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p>Eventa reserves the right to suspend or terminate your access to the Platform if you fail to meet these obligations or breach any part of these Terms.</p>
                    </div>

                    <div className="my-6">
                        <h3 className={`${fraunces.className} text-[15px] font-normal text-[#0f0e0d] mb-2.5 flex items-center gap-2`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                            Account registration and security
                        </h3>
                        <div className="space-y-4 text-[#3a3733]">
                            <p>To create a User Profile, you must provide your name (or, for a business entity, your registered business name), phone number, and email address. You confirm that all information you provide is true, accurate, and complete. You are solely responsible for maintaining the confidentiality of your account credentials. Notify Eventa immediately via WhatsApp if you become aware of any unauthorised access to your account.</p>
                            <p>Eventa reserves the right to request additional information from you at any time to verify your identity or your authority to list an event. Failure to provide such information within a reasonable time may result in your account being suspended or terminated. Eventa may also decline any application to register a User Profile at its sole discretion.</p>
                        </div>
                    </div>
                </div>

                {/* Section 5 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s5">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>05</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Ticket Purchases — Event Attendees</h2>
                    </div>
                    <div className="space-y-4 text-[#3a3733]">
                        <p>Event Attendees may purchase tickets through the Platform without registering a User Profile. By completing a ticket purchase, you agree to these Terms and the refund policy of the relevant Event Organiser, both of which are displayed at checkout before payment.</p>
                        <p>Payments are processed via Orange Money or Afrimoney. A Platform Service Fee, which is non-refundable in all circumstances, is included in the total price shown at checkout. All tickets are delivered digitally to your WhatsApp number within thirty (30) minutes of payment being confirmed.</p>
                        <p>Your purchase of a ticket creates a contract between you and the Event Organiser for attendance at the event. Eventa is not a party to that contract. Any complaints regarding the event, its content, or its quality must be directed to the Event Organiser. Eventa's obligations in respect of ticket delivery and refunds are set out in the Refund Policy.</p>
                    </div>
                </div>

                {/* Section 6 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s6">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>06</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Prohibited Uses</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">You must not use the Platform to:</p>
                    <ul className="list-none my-4 space-y-0 text-[#3a3733]">
                        {[
                            'Carry out any activity that is illegal, fraudulent, or contrary to any law in force in Sierra Leone, including but not limited to money laundering, fraud, or the financing of unlawful activity.',
                            'List a fictitious, misrepresented, or fraudulent event, or provide false or misleading information about any event, venue, performer, or ticket.',
                            'Impersonate any person or entity, or falsely represent your authority to list or sell tickets for an event.',
                            'Access or attempt to access another user\'s account without authorisation.',
                            'Upload, transmit, or distribute any material that contains viruses, malicious code, or any other harmful software.',
                            'Use automated means (including bots or scrapers) to access or interact with the Platform without Eventa\'s prior written consent.',
                            'Take any action that places an unreasonable or disproportionate load on the Platform\'s infrastructure, or that interferes with the use of the Platform by others.',
                            'Copy, reproduce, distribute, or modify any content or element of the Platform without Eventa\'s prior written authorisation.',
                            'Engage in ticket touting, speculative listing, or any resale of tickets in a manner that violates applicable law or Eventa\'s policies.'
                        ].map((item, idx) => (
                            <li key={idx} className="relative py-2.5 pl-5 border-b border-[#e0dbd3] last:border-b-0 text-[14px] leading-[1.65]">
                                <span className="absolute left-0 top-[12px] text-orange-500 text-[12px]">→</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                    <p className="text-[#3a3733]">Eventa reserves the right to suspend or terminate your access to the Platform without notice if it suspects you have engaged in any prohibited use. Eventa may also report such conduct to the relevant authorities and take civil or criminal action where appropriate.</p>
                </div>

                {/* Sections 7-12 */}
                {[
                    { title: "Payments and Fees", content: ["All payments on the Platform are processed via Orange Money or Afrimoney. By completing a purchase, you authorise the deduction of the total amount displayed at checkout from your mobile money account.", "The Platform Service Fee is earned by Eventa on each completed transaction and is non-refundable under all circumstances, including in the event of a cancellation, postponement, or any other situation that may entitle an Event Attendee to a refund of the ticket price.", "Event Organisers will receive ticket sale proceeds in accordance with the payout terms agreed at the time of registration or event listing. Eventa reserves the right to withhold or delay payouts where there is a reasonable suspicion of fraud, a dispute, or a breach of these Terms."] },
                    { title: "Intellectual Property", content: ["The Platform and all of its content, including but not limited to its design, graphics, text, logos, and software, are owned by or licensed to Eventa and are protected by applicable copyright, trademark, and other intellectual property laws.", "You may not copy, reproduce, modify, distribute, or create derivative works from any part of the Platform without Eventa's prior written consent. Where Eventa grants any such authorisation, our status as the owner or author of the relevant content must be acknowledged at all times.", "By listing an event or submitting any content to the Platform, you grant Eventa a non-exclusive, royalty-free licence to use, display, and reproduce that content for the purpose of operating and promoting the Platform and the Services."] },
                    { title: "Communications", content: ["By using the Platform, you consent to receiving all notices, confirmations, tickets, updates, and other communications from Eventa electronically, including via WhatsApp, SMS, or email. You are responsible for ensuring that the contact details you provide to Eventa are accurate and kept up to date.", "Any charges incurred by you in connection with receiving electronic communications (such as data costs) are your own responsibility."] },
                    { title: "Personal Data and Privacy", content: ["Your use of the Platform may involve the collection and processing of your personal information, including your name, phone number, and payment details. By using the Platform, you consent to the collection, use, and processing of your personal data for the purpose of providing the Services.", "Your personal data may be shared with third-party service providers (including payment processors) solely to the extent necessary to deliver the Services. Eventa does not sell your personal data to third parties.", "Eventa processes personal data in accordance with the data protection laws of Sierra Leone. Our Privacy Policy, which forms part of these Terms, sets out in detail how your data is collected, used, stored, and protected."] },
                    { title: "Platform Availability", content: ["Eventa aims to keep the Platform available at all times but does not guarantee uninterrupted access. The Platform may be temporarily unavailable due to scheduled maintenance, technical faults, or circumstances beyond our control. Where possible, scheduled maintenance will be carried out during off-peak hours with minimal disruption.", "Eventa reserves the right to modify, suspend, or discontinue any part of the Platform or the Services, temporarily or permanently, with or without notice. Eventa shall not be liable for any loss or inconvenience caused by any such interruption or modification."] },
                    { title: "Third-Party Services", content: ["The Platform relies on third-party service providers to deliver certain functions, including mobile money payment processing (Orange Money and Afrimoney) and WhatsApp message delivery. Eventa is not responsible for the availability, performance, or practices of these third-party services and is not liable for any loss or disruption caused by them.", "Your use of third-party services connected to the Platform is subject to the terms and conditions of those providers. Eventa's use of a third-party service does not constitute an endorsement of that service. Any dispute relating to a third-party service must be resolved directly with that provider."] },
                ].map((sec, idx) => (
                    <div key={idx} className="mb-14 pt-2 border-t border-[#e0dbd3]" id={`s${idx + 7}`}>
                        <div className="flex items-baseline gap-4 mb-5 pt-6">
                            <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>{(idx + 7).toString().padStart(2, '0')}</span>
                            <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>{sec.title}</h2>
                        </div>
                        <div className="space-y-4 text-[#3a3733]">
                            {sec.content.map((p, pidx) => <p key={pidx}>{p}</p>)}
                        </div>
                    </div>
                ))}

                {/* Section 13 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s13">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>13</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Limitation of Liability</h2>
                    </div>
                    <div className="bg-[#0f0e0d] text-[#a09890] px-8 py-7 my-6 text-[13px] leading-[1.8] tracking-[0.01em]">
                        <strong className="text-[#faf8f4] font-medium">EVENTA IS NOT A PARTY TO ANY TRANSACTION, RELATIONSHIP, OR DISPUTE BETWEEN AN EVENT ORGANISER AND AN EVENT ATTENDEE.</strong> EVENTA DOES NOT PRE-SCREEN EVENT ORGANISERS OR EVENT ATTENDEES AND IS NOT RESPONSIBLE FOR THE QUALITY, SAFETY, LEGALITY, OR DELIVERY OF ANY EVENT.
                    </div>
                    <div className="space-y-4 text-[#3a3733]">
                        <p>To the fullest extent permitted by applicable law, Eventa's total liability to you in connection with your use of the Platform shall not exceed the Platform Service Fee paid by you on the specific transaction giving rise to the claim.</p>
                        <p>Eventa shall not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages, including but not limited to loss of profits, loss of data, loss of goodwill, or business interruption, arising out of or in connection with your use of or inability to use the Platform, whether or not Eventa has been advised of the possibility of such damages.</p>
                        <p>Eventa shall not be liable for any loss or damage arising from: technical failures or interruptions to the Platform; failures of third-party payment processors or delivery services; events cancelled, postponed, or altered by Event Organisers; or circumstances beyond Eventa's reasonable control, including acts of God, government action, civil unrest, pandemic, or power failure.</p>
                    </div>
                </div>

                {/* Section 14 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s14">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>14</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Disclaimer of Warranties</h2>
                    </div>
                    <div className="bg-[#f3f0ea] border-l-[3px] border-orange-500 p-5 md:px-6 my-5 text-[14px] text-[#3a3733] leading-[1.75]">
                        The Platform is provided on an "as is" and "as available" basis. Eventa makes no warranty, express or implied, that the Platform will be uninterrupted, error-free, secure, or free from viruses or other harmful components. Eventa does not warrant the accuracy, completeness, or reliability of any content on the Platform, including event listings submitted by Event Organisers.
                    </div>
                    <p className="text-[#3a3733]">Your use of the Platform is entirely at your own risk. You are responsible for ensuring that your device, software, and internet connection are suitable and secure for accessing the Platform.</p>
                </div>

                {/* Section 15 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s15">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>15</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Indemnification</h2>
                    </div>
                    <p className="text-[#3a3733]">You agree to indemnify, defend, and hold harmless Eventa and its directors, officers, employees, agents, and successors from and against any and all claims, losses, damages, costs, and expenses (including reasonable legal fees) arising out of or in connection with:</p>
                    <ul className="list-none my-4 space-y-0 text-[#3a3733]">
                        {[
                            'Your use of the Platform.',
                            'Your breach of these Terms.',
                            'Any event you list or promote through the Platform.',
                            'Any dispute between you and an Event Attendee or Event Organiser.'
                        ].map((item, idx) => (
                            <li key={idx} className="relative py-2.5 pl-5 border-b border-[#e0dbd3] last:border-b-0 text-[14px] leading-[1.65]">
                                <span className="absolute left-0 top-[12px] text-orange-500 text-[12px]">→</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 16 */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s16">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>16</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Representations and Warranties</h2>
                    </div>
                    <p className="text-[#3a3733]">By using the Platform, you represent and warrant that:</p>
                    <div className="my-5 bg-[#f3f0ea] px-6 py-2">
                        {[
                            'You have read and understood these Terms.',
                            'You are at least 18 years of age.',
                            'All information you provide to Eventa is true, accurate, current, and complete.',
                            'Your use of the Platform does not violate any applicable law in Sierra Leone or any contract or obligation by which you are bound.',
                            'If you are accepting these Terms on behalf of a company or other legal entity, you have the authority to bind that entity to these Terms.',
                            'You will not assign or transfer any of your rights or obligations under these Terms to any other person without Eventa\'s prior written consent.'
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-3 py-3 border-b border-[#e0dbd3] last:border-b-0 text-[14px] text-[#3a3733]">
                                <span className="text-orange-500 text-[13px] flex-shrink-0 mt-[3px]">✓</span>
                                <div>{item}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sections 17-19 */}
                {[
                    { title: "Termination", content: ["Eventa may restrict, suspend, or terminate your access to the Platform at any time, with or without cause, including for any breach of these Terms, without prior notice and without liability to you. Eventa will cooperate with any lawful request from law enforcement or a competent court requiring disclosure of user information.", "You may withdraw from the Platform at any time by ceasing to use it. Where you hold a User Profile, you may request deletion of your account by contacting Eventa via WhatsApp.", "Termination of your access to the Platform does not affect any obligation or liability that arose before termination. Sections of these Terms that by their nature should survive termination (including indemnification, limitation of liability, and governing law) will continue to apply after termination."] },
                    { title: "Severability and General Provisions", content: ["If any provision of these Terms is found to be unlawful, void, or unenforceable, that provision will be severed from the remainder of the Terms. The remaining provisions will continue in full force and effect.", "Eventa's failure to enforce any right or provision under these Terms at any time does not constitute a waiver of that right or provision. Eventa may assign its rights and obligations under these Terms without your consent. You may not assign any of your rights or obligations under these Terms without Eventa's prior written consent.", "The relationship between Eventa and users is that of independent contracting parties. Nothing in these Terms creates any partnership, employment, agency, or joint venture relationship between the parties."] },
                    { title: "Governing Law and Dispute Resolution", content: ["These Terms are governed by and construed in accordance with the laws of Sierra Leone. Any dispute arising out of or in connection with these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the courts of Sierra Leone.", "Before commencing formal legal proceedings, you agree to contact Eventa via WhatsApp to attempt to resolve the dispute informally. If the dispute cannot be resolved informally within thirty (30) days, either party may pursue their legal remedies through the courts of Sierra Leone.", "By continuing to use the Platform after any update to these Terms, you agree to be bound by the updated version. The date of the most recent update is shown in the footer below."] }
                ].map((sec, idx) => (
                    <div key={idx} className="mb-14 pt-2 border-t border-[#e0dbd3]" id={`s${idx + 17}`}>
                        <div className="flex items-baseline gap-4 mb-5 pt-6">
                            <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>{(idx + 17).toString().padStart(2, '0')}</span>
                            <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>{sec.title}</h2>
                        </div>
                        <div className="space-y-4 text-[#3a3733]">
                            {sec.content.map((p, pidx) => <p key={pidx}>{p}</p>)}
                        </div>
                    </div>
                ))}

            </main>

        </div>
    );
}
