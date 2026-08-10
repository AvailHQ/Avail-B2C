import type { FeatureItem } from './shared';
import { FeatureGrid, SectionHeader, gradientText, sectionShell } from './shared';

export function FeaturesSection({ items }: { items: FeatureItem[] }) {
  return (
    <section className={`${sectionShell} flex flex-col justify-center lg:min-h-screen`}>
      <SectionHeader
        label="What Avail Does"
        title={
          <>
            Your whole athletic life,
            <br />
            <span className={gradientText}>in one place</span>
          </>
        }
        subtitle="Designed from the ground up for female athletes who are serious about performance, recovery, and team coordination."
      />
      <FeatureGrid items={items} />
    </section>
  );
}
