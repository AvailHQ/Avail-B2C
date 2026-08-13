import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionHeader, cardClass, pageShell } from './shared';
import { trackIfConsented } from '../../lib/analytics';

interface FaqItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  faqs: FaqItem[];
  expandedFaq: number | null;
  onToggleFaq: (index: number) => void;
}

export function FAQSection({ faqs, expandedFaq, onToggleFaq }: FAQSectionProps) {
  return (
    <section id="faq" className={`${pageShell} flex scroll-mt-24 flex-col justify-center`}>
      <div className="[&_p]:!text-[#5F696D]">
        <SectionHeader title="Frequently Asked Questions" subtitle="Everything you need to know" />
      </div>
      <div className="mx-auto max-w-[800px]">
        {faqs.map((item, index) => (
          <button
            key={item.q}
            aria-expanded={expandedFaq === index}
            aria-controls={`faq-panel-${index}`}
            className={`${cardClass} mb-3 flex w-full cursor-pointer flex-col gap-0 p-6 text-left focus:outline-none focus-visible:ring-3 focus-visible:ring-[#1F6E92] tablet:mb-4 tablet:p-8`}
            onClick={() => {
              if (expandedFaq !== index) trackIfConsented('faq_opened', { question: index + 1 });
              onToggleFaq(index);
            }}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="type-feature-title font-extrabold text-[#1B1F23]">{item.q}</span>
              {expandedFaq === index ? (
                <ChevronUp size={20} className="shrink-0 text-[#2F6A62]" aria-hidden="true" />
              ) : (
                <ChevronDown size={20} className="shrink-0 text-[#556166]" aria-hidden="true" />
              )}
            </span>
            {expandedFaq === index && <span id={`faq-panel-${index}`} role="region" className="type-body mt-4 text-[#5F696D]">{item.a}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
