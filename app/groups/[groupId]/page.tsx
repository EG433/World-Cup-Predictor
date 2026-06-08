import { GroupMembersHub } from "@/components/group-members-hub";
import { getFriendPoolById } from "@/lib/mock-data";

interface PoolPageProps {
  params: Promise<{ groupId: string }>;
}

export function generateStaticParams() {
  return [{ groupId: "harbor-picks" }];
}

export default async function PoolPage({ params }: PoolPageProps) {
  const { groupId } = await params;
  const pool = getFriendPoolById(groupId) ?? null;

  return <GroupMembersHub groupId={groupId} initialPool={pool} />;
}
