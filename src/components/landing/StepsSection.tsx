import type { FeatureItem } from './shared';
import { FeatureGrid, SectionHeader, sectionShell } from './shared';

export function StepsSection({ items }: { items: FeatureItem[] }) {
  return (
    <section className={`${sectionShell} flex flex-col justify-center py-12 lg:min-h-screen`}>
      <SectionHeader title="Get Started in 3 Steps" subtitle="Simple. Science-backed. Powerful." />
      <FeatureGrid items={items} />
    </section>
  );
}
