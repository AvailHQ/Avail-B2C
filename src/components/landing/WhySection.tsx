import type { FeatureItem } from './shared';
import { FeatureGrid, SectionHeader, sectionShell } from './shared';

export function WhySection({ items }: { items: FeatureItem[] }) {
  return (
    <section className={`${sectionShell} flex flex-col justify-center py-12 lg:min-h-screen`}>
      <SectionHeader
        title="Why Women Need a Different App"
        subtitle="Generic training apps ignore how your body actually works. Avail changes that."
      />
      <FeatureGrid items={items} />
    </section>
  );
}
