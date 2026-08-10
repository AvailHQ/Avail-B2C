import type { FeatureItem } from './shared';
import { FeatureGrid, SectionHeader, sectionShell } from './shared';

export function GymBenefitsSection({ items }: { items: FeatureItem[] }) {
  return (
    <section className="flex flex-col justify-center bg-linear-to-b from-[#F4F8FA] to-[#F7FAF8] lg:min-h-screen">
      <div className={`${sectionShell} py-12`}>
        <SectionHeader title="Perfect for Gym Communities" subtitle="Empower your female members with cycle-informed training" />
        <FeatureGrid items={items} />
      </div>
    </section>
  );
}
