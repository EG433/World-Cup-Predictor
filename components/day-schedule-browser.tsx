"use client";

import { useMemo, useState } from "react";

import { MatchCard } from "@/components/match-card";
import type { Match } from "@/types/world-cup";

interface DayScheduleBrowserProps {
  matches: Match[];
}

function matchDateKey(match: Match) {
  return match.kickoff.slice(0, 10);
}

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

export function DayScheduleBrowser({ matches }: DayScheduleBrowserProps) {
  const matchesByDay = useMemo(() => {
    const groups = new Map<string, Match[]>();

    for (const match of matches) {
      const dateKey = matchDateKey(match);
      groups.set(dateKey, [...(groups.get(dateKey) ?? []), match]);
    }

    return Array.from(groups.entries()).sort(([firstDate], [secondDate]) =>
      firstDate.localeCompare(secondDate),
    );
  }, [matches]);
  const [selectedDay, setSelectedDay] = useState(matchesByDay[0]?.[0] ?? "");
  const activeSelectedDay = matchesByDay.some(([dateKey]) => dateKey === selectedDay)
    ? selectedDay
    : matchesByDay[0]?.[0] ?? "";
  const selectedMatches = matchesByDay.find(([dateKey]) => dateKey === activeSelectedDay)?.[1] ?? [];

  if (matchesByDay.length === 0) {
    return <p className="muted-text">No matches are available yet.</p>;
  }

  return (
    <div className="day-schedule-browser">
      <div className="matchday-strip" aria-label="Quick date picker">
        {matchesByDay.map(([dateKey, dayMatches]) => (
          <button
            key={dateKey}
            type="button"
            className={dateKey === activeSelectedDay ? "is-active" : ""}
            onClick={() => setSelectedDay(dateKey)}
          >
            <span>
              {new Intl.DateTimeFormat("en-US", {
                weekday: "short",
                timeZone: "UTC",
              }).format(new Date(`${dateKey}T00:00:00Z`))}
            </span>
            <strong>
              {new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              }).format(new Date(`${dateKey}T00:00:00Z`))}
            </strong>
            <small>{dayMatches.length} matches</small>
          </button>
        ))}
      </div>

      <div className="day-schedule-toolbar">
        <label>
          Choose day
          <select value={activeSelectedDay} onChange={(event) => setSelectedDay(event.target.value)}>
            {matchesByDay.map(([dateKey, dayMatches]) => (
              <option key={dateKey} value={dateKey}>
                {formatDayLabel(dateKey)} ({dayMatches.length} matches)
              </option>
            ))}
          </select>
        </label>
        <div className="day-schedule-summary">
          <span className="eyebrow">Selected date</span>
          <strong>{formatDayLabel(activeSelectedDay)}</strong>
          <span>{selectedMatches.length} matches</span>
        </div>
      </div>

      <div className="day-schedule-group">
        <div className="day-schedule-heading">
          <div>
            <span className="eyebrow">Selected matchday</span>
            <h3>{formatDayLabel(activeSelectedDay)}</h3>
          </div>
          <span>{selectedMatches.length} matches</span>
        </div>
        <div className="match-grid">
          {selectedMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>
    </div>
  );
}
