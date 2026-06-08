import Link from "next/link";

import { EditPicksWorkspace } from "@/components/edit-picks-workspace";
import { getFriendPoolById } from "@/lib/mock-data";

interface PredictionPageProps {
  params: Promise<{ groupId: string }>;
}

export function generateStaticParams() {
  return [{ groupId: "harbor-picks" }];
}

function groupNameFromId(groupId: string) {
  return groupId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function PredictionPage({ params }: PredictionPageProps) {
  const { groupId } = await params;
  const pool = getFriendPoolById(groupId);
  const groupName = pool?.name ?? groupNameFromId(groupId);
  const scoringMode = pool?.scoringMode ?? "traditional";

  return (
    <div className="section-stack">
      <EditPicksWorkspace
        groupId={groupId}
        groupName={groupName}
        scoringMode={scoringMode}
      />

      <div className="page-actions">
        <Link href="/groups" className="secondary-button">
          Manage groups
        </Link>
      </div>
    </div>
  );
}
