import { GroupLobby } from "@/components/group-lobby";

export default function GroupsPage() {
  return (
    <div className="section-stack">
      <section className="groups-hero">
        <div>
          <p className="eyebrow">Prediction groups</p>
          <h1>Build your own supporters&apos; section.</h1>
          <p>
            Create a pool, rally your friends, lock picks, and keep the whole rivalry table inside
            one match-ready lobby.
          </p>
        </div>
        <div className="groups-hero-card" aria-label="Group page highlights">
          <span>2026 pool atmosphere</span>
          <strong>Rivalries, leaderboards, and pick-night chaos.</strong>
        </div>
      </section>

      <GroupLobby />
    </div>
  );
}
