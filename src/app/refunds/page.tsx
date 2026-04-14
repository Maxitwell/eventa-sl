import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Fraunces, DM_Sans } from 'next/font/google';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['300', '400', '500'] });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['300', '400', '500'] });

export default function RefundPage() {
    return (
        <div className={`min-h-screen bg-[#faf8f4] text-[#0f0e0d] flex flex-col ${dmSans.className} text-[15px] leading-relaxed font-light antialiased`}>
            <Navbar />
            
            {/* Hero Section */}
            <div className="bg-[#0f0e0d] text-[#faf8f4] relative overflow-hidden px-6 md:px-20 py-16 md:py-24">
                <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-orange-500/20 pointer-events-none" />
                
                <div className="text-[11px] font-medium tracking-[0.14em] uppercase text-orange-500 mb-4">
                    Legal Documentation
                </div>
                
                <h1 className={`${fraunces.className} text-4xl md:text-7xl font-light leading-[1.05] tracking-[-0.03em] max-w-2xl mb-4`}>
                    Refund Policy
                </h1>
                
                <p className="text-[#a09890] max-w-2xl text-[15px] leading-[1.7] mb-6">
                    Eventa exists to make events accessible and trustworthy for everyone in Sierra Leone. This policy explains exactly when and how you can get your money back.
                </p>
                
                <div className="flex flex-wrap gap-6 text-[13px] text-[#7a746c]">
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Last updated April 2026</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> Sierra Leone</span>
                    <span className="flex items-center gap-1.5"><span className="text-orange-500">—</span> eventa.africa</span>
                </div>
            </div>

            <main className="max-w-[900px] mx-auto w-full px-6 md:px-20 py-12 md:py-20">
                
                {/* Summary Banner */}
                <div className="bg-[#f3f0ea] border-l-[3px] border-orange-500 p-7 md:p-8 mb-14 text-[14px] text-[#3a3733] leading-[1.8]">
                    <p>Eventa is a self-service ticketing platform. Event Organisers independently list and manage their own events. Eventa facilitates ticket sales but does not organise or control events. By completing a purchase, you confirm you have read and accepted this Policy and the Organiser's stated refund terms, both shown at checkout before payment.</p>
                    <p className="mt-4"><strong className="text-[#0f0e0d]">Please note:</strong> A non-refundable Platform Service Fee is included in the total price at checkout. This fee is retained by Eventa in all cases and does not form part of any refund.</p>
                </div>

                {/* TOC */}
                <div className="bg-[#f3f0ea] border-l-[3px] border-orange-500 p-7 md:p-8 mb-14">
                    <div className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#7a746c] mb-4">Contents</div>
                    <ol className="list-none space-y-1.5 text-[13.5px]">
                        {[
                            'Guaranteed Refunds — No Exceptions', 
                            'Organiser-Set Refund Policies', 
                            'Situations Where Refunds Do Not Apply', 
                            'How Refunds Are Processed', 
                            'Limitation of Liability', 
                            'Governing Law and Disputes'
                        ].map((title, i) => (
                            <li key={i}>
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

                {/* Section 1: Guaranteed Refunds */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s1">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>01</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Guaranteed Refunds — No Exceptions</h2>
                    </div>
                    <p className="mb-6 text-[#3a3733]">In the following situations, Eventa will always refund you the full ticket price, regardless of the Organiser's stated policy. These protections cannot be removed by any Organiser.</p>

                    <div className="grid gap-[2px] bg-[#e0dbd3] border border-[#e0dbd3] my-6">
                        {[
                            { 
                                title: "Event cancelled by the Organiser", 
                                desc: "If the Organiser cancels the event for any reason before it starts, every Ticket Holder receives a full refund automatically. You do not need to request it. Refunds are processed within five (5) business days of the cancellation being confirmed on the Platform.",
                                badge: "Full Refund",
                                badgeClass: "bg-[#e4f0ea] text-[#2a6b4a]"
                            },
                            { 
                                title: "Event postponed without your consent", 
                                desc: "If the event date, time, or venue changes after you purchased your ticket and you are unable or unwilling to attend on the revised terms, you may request a full refund. Requests must be submitted within seven (7) calendar days of the change being announced. Requests received after this window will not be eligible.",
                                badge: "Full Refund",
                                badgeClass: "bg-[#e4f0ea] text-[#2a6b4a]"
                            },
                            { 
                                title: "Duplicate payment", 
                                desc: "If a verified technical error causes your payment method to be charged more than once for the same ticket, the duplicate charge will be refunded within three (3) business days of the error being confirmed. Duplicate charges must be reported within fourteen (14) calendar days of the transaction date.",
                                badge: "Full Refund",
                                badgeClass: "bg-[#e4f0ea] text-[#2a6b4a]"
                            },
                            { 
                                title: "Ticket not delivered after payment", 
                                desc: "If your payment is confirmed but your ticket does not arrive on WhatsApp within thirty (30) minutes, contact Eventa Support immediately. If we cannot deliver your ticket within a further two (2) hours, you will receive a full refund. Ticket Holders who gain entry using an alternative access method provided by Eventa waive their right to a refund under this clause.",
                                badge: "Full Refund",
                                badgeClass: "bg-[#e4f0ea] text-[#2a6b4a]"
                            },
                            { 
                                title: "Fraudulent or materially misrepresented event", 
                                desc: "If Eventa determines, based on verifiable evidence, that an event was listed with materially false information (for example: a fabricated venue, false performer lineup, or fundamentally inaccurate description), all affected Ticket Holders will be fully refunded. Eventa's determination under this clause is final. Dissatisfaction with artistic or production quality alone does not constitute misrepresentation.",
                                badge: "Full Refund",
                                badgeClass: "bg-[#e4f0ea] text-[#2a6b4a]"
                            }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-[#faf8f4] p-6 grid sm:grid-cols-[1fr_auto] gap-3 items-start">
                                <div>
                                    <div className="font-medium text-[14px] text-[#0f0e0d] mb-2">{card.title}</div>
                                    <div className="text-[13.5px] text-[#7a746c] leading-[1.65]">{card.desc}</div>
                                </div>
                                <span className={`text-[10px] font-medium tracking-[0.1em] uppercase px-2.5 py-1 rounded-[2px] whitespace-nowrap self-start ${card.badgeClass}`}>
                                    {card.badge}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 2: Organiser Policies */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s2">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>02</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Organiser-Set Refund Policies</h2>
                    </div>
                    <p className="mb-4 text-[#3a3733]">For all other situations (including personal inability to attend, change of mind, or scheduling conflicts) the refund policy is set by the event Organiser when they create the event. You will see the policy clearly before completing your purchase. The available options are:</p>
                    
                    <div className="grid gap-[1px] bg-[#e0dbd3] border border-[#e0dbd3] my-5">
                        {[
                            { label: "Option 1", title: "Full refund window", desc: "A full refund of the ticket price is available if requested within a defined period before the event — for example, no later than forty-eight (48) hours before the scheduled start. Requests received after the stated deadline will not qualify." },
                            { label: "Option 2", title: "Partial refund", desc: "A percentage of the ticket price (for example, 50%) may be refunded if requested within a stated window. The Organiser retains the remainder to cover costs. The specific percentage and deadline will be shown at checkout." },
                            { label: "Option 3", title: "Ticket transfer", desc: "Instead of a refund, the Organiser may allow you to transfer your ticket to another person. Contact the Organiser directly to arrange this. Eventa is not a party to transfer arrangements between Ticket Holders and Organisers." },
                            { label: "Option 4", title: "Non-refundable", desc: "Some events are sold on a strictly no-refund basis. This will be stated clearly before you pay. By completing your purchase, you irrevocably agree that no refund will be issued for personal inability to attend, change of mind, or any reason not covered by Section 1 of this Policy." }
                        ].map((opt, idx) => (
                            <div key={idx} className="bg-[#faf8f4] p-5 md:px-6 flex gap-4 items-start">
                                <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-[#7a746c] min-w-[90px] pt-0.5">{opt.label}</div>
                                <div>
                                    <div className="font-medium text-[14px] text-[#0f0e0d] mb-1.5">{opt.title}</div>
                                    <div className="text-[13.5px] text-[#7a746c] leading-[1.65]">{opt.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[#3a3733]">You will always see the Organiser's refund policy on the checkout page before you pay. Please read it carefully before completing your purchase. Eventa will not override an Organiser's stated policy for reasons not covered by Section 1.</p>
                </div>

                {/* Section 3: Situations Where Refunds Do Not Apply */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s3">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>03</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>Situations Where Refunds Do Not Apply</h2>
                    </div>
                    <p className="text-[#3a3733]">Refunds will not be issued in the following circumstances:</p>

                    <div className="my-5 divide-y divide-[#e0dbd3]">
                        {[
                            { title: "No-show", desc: "If the event took place as advertised and you did not attend, no refund will be issued regardless of the reason for your absence." },
                            { title: "Dissatisfaction with the event", desc: "Eventa is not responsible for the quality or content of events. Complaints about your experience must be directed to the Organiser. Dissatisfaction with the event does not entitle you to a refund from Eventa." },
                            { title: "Request made after the event date", desc: "Refund requests submitted after the event has already taken place will not be considered, except where the claim relates to fraud, a verified technical failure on the Platform, or a duplicate payment as described in Section 1." },
                            { title: "Request outside the Organiser's stated window", desc: "If you request a refund after the deadline set by the Organiser, Eventa cannot override their policy." },
                            { title: "Force majeure", desc: "Eventa and Organisers are not liable for events cancelled, postponed, or disrupted due to circumstances beyond reasonable control, including acts of God, natural disasters, fire, war, pandemic, epidemic, government action, power failure, or civil unrest. In such cases Eventa will use reasonable efforts to facilitate communication between Ticket Holders and Organisers but carries no independent refund obligation arising solely from a force majeure event." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-start py-4">
                                <div className="w-6 h-6 rounded-full bg-[#f5e8e8] text-[#9b2c2c] text-[12px] font-medium flex items-center justify-center flex-shrink-0 mt-0.5">✕</div>
                                <div>
                                    <div className="font-medium text-[14px] text-[#0f0e0d] mb-1">{item.title}</div>
                                    <div className="text-[13.5px] text-[#7a746c] leading-[1.65]">{item.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section 4: Process */}
                <div className="mb-14 pt-2 border-t border-[#e0dbd3]" id="s4">
                    <div className="flex items-baseline gap-4 mb-5 pt-6">
                        <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>04</span>
                        <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>How Refunds Are Processed</h2>
                    </div>
                    <p className="text-[#3a3733]">All refunds are returned to the original payment method used at checkout — your Orange Money or Afrimoney number. Processing typically takes three (3) to five (5) business days depending on your network provider.</p>
                    
                    <div className="bg-[#f3f0ea] p-6 my-5 divide-y divide-[#e0dbd3]">
                        {[
                            { num: "1", content: "Send a WhatsApp message to Eventa Support with your <strong>Ticket ID</strong> and the reason for your request." },
                            { num: "2", content: "We will respond within <strong>twenty-four (24) hours</strong>. Eventa reserves the right to request supporting documentation before processing a claim." },
                            { num: "3", content: "Once approved, the refund is returned to your <strong>original mobile money number</strong> within 3–5 business days." }
                        ].map((step, idx) => (
                            <div key={idx} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                                <span className={`${fraunces.className} text-[20px] font-light text-orange-500 min-w-[28px] leading-tight`}>{step.num}</span>
                                <div className="text-[14px] text-[#3a3733] leading-[1.7]" dangerouslySetInnerHTML={{ __html: step.content }} />
                            </div>
                        ))}
                    </div>

                    <p className="mt-4 text-[13.5px] text-[#7a746c]">Providing false or misleading information in connection with a refund request may result in the claim being rejected and your account being suspended.</p>
                    
                    <div className="border border-[#e0dbd3] rounded-[4px] overflow-hidden my-6 font-sans">
                        <div className="bg-[#0f0e0d] text-[#7a746c] text-[10px] font-medium tracking-[0.12em] uppercase px-4 py-2">What you'll see at checkout</div>
                        <div className="bg-[#f3f0ea] p-5 text-[13.5px] text-[#3a3733] leading-[1.75] italic">
                            "Refund policy: [Organiser's selected option, for example: Full refund available up to 48 hours before the event / Non-refundable]. In the event of cancellation by the Organiser, you will receive a full refund of the ticket price within 3 to 5 business days to your mobile money number. A non-refundable Platform Service Fee applies to all purchases."
                        </div>
                    </div>
                </div>

                {/* Section 5 & 6 */}
                {[
                    { title: "Limitation of Liability", content: ["To the fullest extent permitted by applicable law, Eventa's total liability to any Ticket Holder in connection with a ticket purchase shall not exceed the ticket price paid for the specific ticket giving rise to the claim, excluding the Platform Service Fee.", "Eventa shall not be liable for any indirect, incidental, consequential, special, punitive, or exemplary damages arising out of or in connection with any event, cancellation, postponement, or refund decision, whether or not Eventa has been advised of the possibility of such damages."] },
                    { title: "Governing Law and Disputes", content: ["This Policy is governed by and construed in accordance with the laws of Sierra Leone. Any dispute arising out of or in connection with this Policy shall be subject to the exclusive jurisdiction of the courts of Sierra Leone.", "Ticket Holders are encouraged to contact Eventa Support via WhatsApp before pursuing formal legal proceedings."] }
                ].map((sec, idx) => (
                    <div key={idx} className="mb-14 pt-2 border-t border-[#e0dbd3]" id={`s${idx + 5}`}>
                        <div className="flex items-baseline gap-4 mb-5 pt-6">
                            <span className={`${fraunces.className} text-[13px] font-light text-orange-500 min-w-[28px]`}>{(idx + 5).toString().padStart(2, '0')}</span>
                            <h2 className={`${fraunces.className} text-xl md:text-2xl font-normal tracking-[-0.02em] text-[#0f0e0d] leading-[1.2]`}>{sec.title}</h2>
                        </div>
                        <div className="space-y-4 text-[#3a3733]">
                            {sec.content.map((p, pidx) => <p key={pidx}>{p}</p>)}
                        </div>
                    </div>
                ))}

            </main>

            <footer className="bg-[#0f0e0d] text-[#7a746c] px-6 md:px-20 py-8 text-[12px] flex justify-between items-center flex-wrap gap-3 border-t-2 border-orange-500 mt-auto">
                <span>Last updated: April 2026 · Eventa is operated in Sierra Leone</span>
                <div className="flex gap-5 flex-wrap">
                    <a href="/terms" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Terms &amp; Conditions</a>
                    <a href="/privacy" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Privacy Policy</a>
                    <a href="#" className="text-[#faf8f4] hover:text-orange-500 transition-colors">Contact via WhatsApp</a>
                </div>
            </footer>
        </div>
    );
}
