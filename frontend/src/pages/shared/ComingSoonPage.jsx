import { PageContainer } from "../../components/ui/PageContainer";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";

export function ComingSoonPage({ title = "Coming Soon" }) {
  return (
    <PageContainer>
      <SectionCard title={title}>
        <EmptyState message="This page is under construction." />
      </SectionCard>
    </PageContainer>
  );
}
