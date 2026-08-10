import { ChevronDown, ChevronUp } from 'lucide-react';
import { SectionHeader, cardClass, sectionShell } from './shared';

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
    <section className={`${sectionShell} flex flex-col justify-center py-12 lg:min-h-screen`}>
      <SectionHeader title="Frequently Asked Questions" subtitle="Everything you need to know" />
      <div className="mx-auto max-w-[800px]">
        {faqs.map((item, index) => (
          <button
            key={item.q}
            className={`${cardClass} mb-4 flex w-full cursor-pointer flex-col gap-0 text-left`}
            onClick={() => onToggleFaq(index)}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="text-lg font-extrabold tracking-normal text-[#1B1F23]">{item.q}</span>
              {expandedFaq === index ? (
                <ChevronUp size={20} className="shrink-0 text-[#6FBF9E]" />
              ) : (
                <ChevronDown size={20} className="shrink-0 text-[#64707D]" />
              )}
            </span>
            {expandedFaq === index && <span className="mt-4 text-sm leading-7 text-[#64707D]">{item.a}</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
