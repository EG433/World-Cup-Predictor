import {
  correctAwayGoalsPoints,
  correctHomeGoalsPoints,
  correctResultPoints,
  correctTopTwoSwappedBonus,
  exactGroupOrderBonus,
  exactScoreBonusPoints,
  groupRankingPositionPoints,
  knockoutPointValues,
  upsetBonusLargeGap,
  upsetBonusMediumGap,
  predictionDeadline,
} from "@/lib/scoring";

const fifaRankingUrl = "https://inside.fifa.com/fifa-world-ranking/men";

export function ScoringRulesPanel() {
  const deadline = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(predictionDeadline));

  return (
    <section className="rules-panel" aria-label="Prediction scoring rules">
      <div className="rules-panel-header">
        <div>
          <p className="eyebrow">Pool scoring</p>
          <h2>Scoring rules</h2>
        </div>
      </div>

      <div className="rules-grid">
        <article>
          <h3>Correct result</h3>
          <p>
            Correctly predict the winner or correctly predict a draw: +
            {correctResultPoints} points.
          </p>
        </article>

        <article>
          <h3>Correct score</h3>
          <ul className="rules-list">
            <li>
              Correctly predict the number of home team goals: +{correctHomeGoalsPoints} point
            </li>
            <li>
              Correctly predict the number of away team goals: +{correctAwayGoalsPoints} point
            </li>
            <li>Exact score bonus: +{exactScoreBonusPoints} points</li>
          </ul>
        </article>

        <article>
          <h3>Group rankings</h3>
          <ul className="rules-list">
            <li>Exact 1st place team: +{groupRankingPositionPoints[0]} points</li>
            <li>Exact 2nd place team: +{groupRankingPositionPoints[1]} points</li>
            <li>Exact 3rd place team: +{groupRankingPositionPoints[2]} point</li>
            <li>Exact 4th place team: +{groupRankingPositionPoints[3]} point</li>
            <li>
              Correct top 2 teams but swapped: +{correctTopTwoSwappedBonus} bonus point
            </li>
            <li>Exact full group order: +{exactGroupOrderBonus} bonus points</li>
          </ul>
        </article>

        <article>
          <h3>Knockout bracket</h3>
          <ul className="rules-list">
            <li>Round of 32: {knockoutPointValues["Round of 32"]} points</li>
            <li>Round of 16: {knockoutPointValues["Round of 16"]} points</li>
            <li>Quarterfinal: {knockoutPointValues.Quarterfinal} points</li>
            <li>Semifinal: {knockoutPointValues.Semifinal} points</li>
            <li>Final: {knockoutPointValues.Final} points</li>
          </ul>
        </article>

        <article>
          <h3>Official knockout match picks</h3>
          <ul className="rules-list">
            <li>
              Correctly predict the number of home team goals: +{correctHomeGoalsPoints} point
            </li>
            <li>
              Correctly predict the number of away team goals: +{correctAwayGoalsPoints} point
            </li>
            <li>Exact score bonus: +{exactScoreBonusPoints} points</li>
            <li>Advancing side is based on the 120-minute score only</li>
            <li>Penalty shootouts are ignored for official knockout scoring</li>
            <li>Round winner points only apply when your score implies the same advancing team</li>
          </ul>
        </article>

        <article>
          <h3>Upset bonus</h3>
          <ul className="rules-list">
            <li>Applies to both group stage and knockout when you pick the lower-ranked winner correctly</li>
            <li>Ranking gap 10-19: +{upsetBonusMediumGap} bonus point</li>
            <li>Ranking gap 20+: +{upsetBonusLargeGap} bonus points</li>
          </ul>
        </article>

        <article>
          <h3>Ranking source</h3>
          <p>
            Lower-ranked teams are defined by the official FIFA/Coca-Cola Men&apos;s World Ranking
            across the 48 World Cup teams.
          </p>
          <p>
            Source:{" "}
            <a href={fifaRankingUrl} className="inline-link" target="_blank" rel="noreferrer">
              FIFA Men&apos;s World Ranking
            </a>
          </p>
        </article>

        <article>
          <h3>Deadline</h3>
          <p>All predictions lock before {deadline}.</p>
        </article>
      </div>
    </section>
  );
}
