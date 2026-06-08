import { GroupLobby } from "@/components/group-lobby";

export default function GroupsPage() {
  return (
    <div className="section-stack">
      <section className="groups-hero">
        <div>
          <p className="eyebrow">Prediction groups</p>
          <h1>Your World Cup command room.</h1>
          <p>
            Create a private pool, invite friends, save picks, and follow the leaderboard from one
            clean lobby.
          </p>
        </div>
        <div className="groups-hero-card" aria-label="Group page highlights">
          <span>2026 pool hub</span>
          <strong>Groups, picks, members, scores.</strong>
        </div>
      </section>

      <GroupLobby />
    </div>
  );
}
