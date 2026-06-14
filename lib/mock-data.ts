import {
  AppUser,
  FriendPool,
  GroupStanding,
  Match,
  MatchStage,
  Team,
  TournamentGroup,
} from "@/types/world-cup";

export const fifaScheduleSource =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums";

const teamSeed: Array<
  [string, string, string, string, number, number, Team["confederation"]]
> = [
  ["mexico", "Mexico", "MEX", "mx", 15, 14, "CONCACAF"],
  ["south-africa", "South Africa", "RSA", "za", 60, 40, "CAF"],
  ["korea-republic", "Korea Republic", "KOR", "kr", 25, 23, "AFC"],
  ["czechia", "Czechia", "CZE", "cz", 41, 33, "UEFA"],
  ["canada", "Canada", "CAN", "ca", 30, 27, "CONCACAF"],
  ["bosnia-and-herzegovina", "Bosnia and Herzegovina", "BIH", "ba", 65, 43, "UEFA"],
  ["qatar", "Qatar", "QAT", "qa", 55, 38, "AFC"],
  ["switzerland", "Switzerland", "SUI", "ch", 19, 18, "UEFA"],
  ["haiti", "Haiti", "HAI", "ht", 83, 47, "CONCACAF"],
  ["scotland", "Scotland", "SCO", "gb-sct", 43, 34, "UEFA"],
  ["brazil", "Brazil", "BRA", "br", 6, 6, "CONMEBOL"],
  ["morocco", "Morocco", "MAR", "ma", 8, 8, "CAF"],
  ["united-states", "United States", "USA", "us", 16, 15, "CONCACAF"],
  ["paraguay", "Paraguay", "PAR", "py", 40, 32, "CONMEBOL"],
  ["australia", "Australia", "AUS", "au", 27, 24, "AFC"],
  ["turkiye", "Türkiye", "TUR", "tr", 22, 20, "UEFA"],
  ["cote-divoire", "Côte d'Ivoire", "CIV", "ci", 34, 30, "CAF"],
  ["ecuador", "Ecuador", "ECU", "ec", 23, 21, "CONMEBOL"],
  ["germany", "Germany", "GER", "de", 10, 10, "UEFA"],
  ["curacao", "Curaçao", "CUW", "cw", 82, 46, "CONCACAF"],
  ["netherlands", "Netherlands", "NED", "nl", 7, 7, "UEFA"],
  ["japan", "Japan", "JPN", "jp", 18, 17, "AFC"],
  ["sweden", "Sweden", "SWE", "se", 38, 31, "UEFA"],
  ["tunisia", "Tunisia", "TUN", "tn", 44, 35, "CAF"],
  ["belgium", "Belgium", "BEL", "be", 9, 9, "UEFA"],
  ["ir-iran", "IR Iran", "IRN", "ir", 21, 19, "AFC"],
  ["new-zealand", "New Zealand", "NZL", "nz", 85, 48, "OFC"],
  ["egypt", "Egypt", "EGY", "eg", 29, 26, "CAF"],
  ["saudi-arabia", "Saudi Arabia", "KSA", "sa", 61, 41, "AFC"],
  ["uruguay", "Uruguay", "URU", "uy", 17, 16, "CONMEBOL"],
  ["spain", "Spain", "ESP", "es", 2, 2, "UEFA"],
  ["cabo-verde", "Cabo Verde", "CPV", "cv", 69, 44, "CAF"],
  ["france", "France", "FRA", "fr", 1, 1, "UEFA"],
  ["senegal", "Senegal", "SEN", "sn", 14, 13, "CAF"],
  ["iraq", "Iraq", "IRQ", "iq", 57, 39, "AFC"],
  ["norway", "Norway", "NOR", "no", 31, 28, "UEFA"],
  ["argentina", "Argentina", "ARG", "ar", 3, 3, "CONMEBOL"],
  ["algeria", "Algeria", "ALG", "dz", 28, 25, "CAF"],
  ["austria", "Austria", "AUT", "at", 24, 22, "UEFA"],
  ["jordan", "Jordan", "JOR", "jo", 63, 42, "AFC"],
  ["portugal", "Portugal", "POR", "pt", 5, 5, "UEFA"],
  ["uzbekistan", "Uzbekistan", "UZB", "uz", 50, 37, "AFC"],
  ["colombia", "Colombia", "COL", "co", 13, 12, "CONMEBOL"],
  ["congo-dr", "Congo DR", "COD", "cd", 46, 36, "CAF"],
  ["england", "England", "ENG", "gb-eng", 4, 4, "UEFA"],
  ["ghana", "Ghana", "GHA", "gh", 74, 45, "CAF"],
  ["panama", "Panama", "PAN", "pa", 33, 29, "CONCACAF"],
  ["croatia", "Croatia", "CRO", "hr", 11, 11, "UEFA"],
];

export const teams: Team[] = teamSeed.map(([id, name, code, flagCode, fifaRank, tournamentSeed, confederation]) => ({
  id,
  name,
  code,
  flagCode,
  fifaRank,
  tournamentSeed,
  confederation,
}));

export const tournamentGroups: TournamentGroup[] = [
  { id: "a", label: "Group A", teamIds: ["mexico", "south-africa", "korea-republic", "czechia"] },
  { id: "b", label: "Group B", teamIds: ["canada", "bosnia-and-herzegovina", "qatar", "switzerland"] },
  { id: "c", label: "Group C", teamIds: ["haiti", "scotland", "brazil", "morocco"] },
  { id: "d", label: "Group D", teamIds: ["united-states", "paraguay", "australia", "turkiye"] },
  { id: "e", label: "Group E", teamIds: ["cote-divoire", "ecuador", "germany", "curacao"] },
  { id: "f", label: "Group F", teamIds: ["netherlands", "japan", "sweden", "tunisia"] },
  { id: "g", label: "Group G", teamIds: ["belgium", "ir-iran", "new-zealand", "egypt"] },
  { id: "h", label: "Group H", teamIds: ["saudi-arabia", "uruguay", "spain", "cabo-verde"] },
  { id: "i", label: "Group I", teamIds: ["france", "senegal", "iraq", "norway"] },
  { id: "j", label: "Group J", teamIds: ["argentina", "algeria", "austria", "jordan"] },
  { id: "k", label: "Group K", teamIds: ["portugal", "uzbekistan", "colombia", "congo-dr"] },
  { id: "l", label: "Group L", teamIds: ["england", "ghana", "panama", "croatia"] },
];

type GroupFixtureSeed = {
  matchNumber: number;
  date: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  venue: string;
  city: string;
};

const groupFixtureSeed: GroupFixtureSeed[] = [
  { matchNumber: 1, date: "2026-06-11", groupId: "a", homeTeamId: "mexico", awayTeamId: "south-africa", venue: "Mexico City Stadium", city: "Mexico City" },
  { matchNumber: 2, date: "2026-06-11", groupId: "a", homeTeamId: "korea-republic", awayTeamId: "czechia", venue: "Estadio Guadalajara", city: "Guadalajara" },
  { matchNumber: 3, date: "2026-06-12", groupId: "b", homeTeamId: "canada", awayTeamId: "bosnia-and-herzegovina", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 4, date: "2026-06-12", groupId: "d", homeTeamId: "united-states", awayTeamId: "paraguay", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 5, date: "2026-06-13", groupId: "c", homeTeamId: "haiti", awayTeamId: "scotland", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 6, date: "2026-06-13", groupId: "d", homeTeamId: "australia", awayTeamId: "turkiye", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 7, date: "2026-06-13", groupId: "c", homeTeamId: "brazil", awayTeamId: "morocco", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 8, date: "2026-06-13", groupId: "b", homeTeamId: "qatar", awayTeamId: "switzerland", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 9, date: "2026-06-14", groupId: "e", homeTeamId: "cote-divoire", awayTeamId: "ecuador", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 10, date: "2026-06-14", groupId: "e", homeTeamId: "germany", awayTeamId: "curacao", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 11, date: "2026-06-14", groupId: "f", homeTeamId: "netherlands", awayTeamId: "japan", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 12, date: "2026-06-14", groupId: "f", homeTeamId: "sweden", awayTeamId: "tunisia", venue: "Estadio Monterrey", city: "Monterrey" },
  { matchNumber: 13, date: "2026-06-15", groupId: "h", homeTeamId: "saudi-arabia", awayTeamId: "uruguay", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 14, date: "2026-06-15", groupId: "h", homeTeamId: "spain", awayTeamId: "cabo-verde", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 15, date: "2026-06-15", groupId: "g", homeTeamId: "ir-iran", awayTeamId: "new-zealand", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 16, date: "2026-06-15", groupId: "g", homeTeamId: "belgium", awayTeamId: "egypt", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 17, date: "2026-06-16", groupId: "i", homeTeamId: "france", awayTeamId: "senegal", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 18, date: "2026-06-16", groupId: "i", homeTeamId: "iraq", awayTeamId: "norway", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 19, date: "2026-06-16", groupId: "j", homeTeamId: "argentina", awayTeamId: "algeria", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 20, date: "2026-06-16", groupId: "j", homeTeamId: "austria", awayTeamId: "jordan", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 21, date: "2026-06-17", groupId: "l", homeTeamId: "ghana", awayTeamId: "panama", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 22, date: "2026-06-17", groupId: "l", homeTeamId: "england", awayTeamId: "croatia", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 23, date: "2026-06-17", groupId: "k", homeTeamId: "portugal", awayTeamId: "congo-dr", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 24, date: "2026-06-17", groupId: "k", homeTeamId: "uzbekistan", awayTeamId: "colombia", venue: "Mexico City Stadium", city: "Mexico City" },
  { matchNumber: 25, date: "2026-06-18", groupId: "a", homeTeamId: "czechia", awayTeamId: "south-africa", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 26, date: "2026-06-18", groupId: "b", homeTeamId: "switzerland", awayTeamId: "bosnia-and-herzegovina", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 27, date: "2026-06-18", groupId: "b", homeTeamId: "canada", awayTeamId: "qatar", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 28, date: "2026-06-18", groupId: "a", homeTeamId: "mexico", awayTeamId: "korea-republic", venue: "Estadio Guadalajara", city: "Guadalajara" },
  { matchNumber: 29, date: "2026-06-19", groupId: "c", homeTeamId: "brazil", awayTeamId: "haiti", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 30, date: "2026-06-19", groupId: "c", homeTeamId: "scotland", awayTeamId: "morocco", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 31, date: "2026-06-19", groupId: "d", homeTeamId: "turkiye", awayTeamId: "paraguay", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 32, date: "2026-06-19", groupId: "d", homeTeamId: "united-states", awayTeamId: "australia", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 33, date: "2026-06-20", groupId: "e", homeTeamId: "germany", awayTeamId: "cote-divoire", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 34, date: "2026-06-20", groupId: "e", homeTeamId: "ecuador", awayTeamId: "curacao", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 35, date: "2026-06-20", groupId: "f", homeTeamId: "netherlands", awayTeamId: "sweden", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 36, date: "2026-06-20", groupId: "f", homeTeamId: "tunisia", awayTeamId: "japan", venue: "Estadio Monterrey", city: "Monterrey" },
  { matchNumber: 37, date: "2026-06-21", groupId: "h", homeTeamId: "uruguay", awayTeamId: "cabo-verde", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 38, date: "2026-06-21", groupId: "h", homeTeamId: "spain", awayTeamId: "saudi-arabia", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 39, date: "2026-06-21", groupId: "g", homeTeamId: "belgium", awayTeamId: "ir-iran", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 40, date: "2026-06-21", groupId: "g", homeTeamId: "new-zealand", awayTeamId: "egypt", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 41, date: "2026-06-22", groupId: "i", homeTeamId: "norway", awayTeamId: "senegal", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 42, date: "2026-06-22", groupId: "i", homeTeamId: "france", awayTeamId: "iraq", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 43, date: "2026-06-22", groupId: "j", homeTeamId: "argentina", awayTeamId: "austria", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 44, date: "2026-06-22", groupId: "j", homeTeamId: "jordan", awayTeamId: "algeria", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 45, date: "2026-06-23", groupId: "l", homeTeamId: "england", awayTeamId: "ghana", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 46, date: "2026-06-23", groupId: "l", homeTeamId: "panama", awayTeamId: "croatia", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 47, date: "2026-06-23", groupId: "k", homeTeamId: "portugal", awayTeamId: "uzbekistan", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 48, date: "2026-06-23", groupId: "k", homeTeamId: "colombia", awayTeamId: "congo-dr", venue: "Estadio Guadalajara", city: "Guadalajara" },
  { matchNumber: 49, date: "2026-06-24", groupId: "c", homeTeamId: "scotland", awayTeamId: "brazil", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 50, date: "2026-06-24", groupId: "c", homeTeamId: "morocco", awayTeamId: "haiti", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 51, date: "2026-06-24", groupId: "b", homeTeamId: "switzerland", awayTeamId: "canada", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 52, date: "2026-06-24", groupId: "b", homeTeamId: "bosnia-and-herzegovina", awayTeamId: "qatar", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 53, date: "2026-06-24", groupId: "a", homeTeamId: "czechia", awayTeamId: "mexico", venue: "Mexico City Stadium", city: "Mexico City" },
  { matchNumber: 54, date: "2026-06-24", groupId: "a", homeTeamId: "south-africa", awayTeamId: "korea-republic", venue: "Estadio Monterrey", city: "Monterrey" },
  { matchNumber: 55, date: "2026-06-25", groupId: "e", homeTeamId: "curacao", awayTeamId: "cote-divoire", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 56, date: "2026-06-25", groupId: "e", homeTeamId: "ecuador", awayTeamId: "germany", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 57, date: "2026-06-25", groupId: "f", homeTeamId: "japan", awayTeamId: "sweden", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 58, date: "2026-06-25", groupId: "f", homeTeamId: "tunisia", awayTeamId: "netherlands", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 59, date: "2026-06-25", groupId: "d", homeTeamId: "turkiye", awayTeamId: "united-states", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 60, date: "2026-06-25", groupId: "d", homeTeamId: "paraguay", awayTeamId: "australia", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 61, date: "2026-06-26", groupId: "i", homeTeamId: "norway", awayTeamId: "france", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 62, date: "2026-06-26", groupId: "i", homeTeamId: "senegal", awayTeamId: "iraq", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 63, date: "2026-06-26", groupId: "g", homeTeamId: "egypt", awayTeamId: "ir-iran", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 64, date: "2026-06-26", groupId: "g", homeTeamId: "new-zealand", awayTeamId: "belgium", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 65, date: "2026-06-26", groupId: "h", homeTeamId: "cabo-verde", awayTeamId: "saudi-arabia", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 66, date: "2026-06-26", groupId: "h", homeTeamId: "uruguay", awayTeamId: "spain", venue: "Estadio Guadalajara", city: "Guadalajara" },
  { matchNumber: 67, date: "2026-06-27", groupId: "l", homeTeamId: "panama", awayTeamId: "england", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 68, date: "2026-06-27", groupId: "l", homeTeamId: "croatia", awayTeamId: "ghana", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 69, date: "2026-06-27", groupId: "j", homeTeamId: "algeria", awayTeamId: "austria", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 70, date: "2026-06-27", groupId: "j", homeTeamId: "jordan", awayTeamId: "argentina", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 71, date: "2026-06-27", groupId: "k", homeTeamId: "colombia", awayTeamId: "portugal", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 72, date: "2026-06-27", groupId: "k", homeTeamId: "congo-dr", awayTeamId: "uzbekistan", venue: "Atlanta Stadium", city: "Atlanta" },
];

type KnockoutFixtureSeed = {
  matchNumber: number;
  date: string;
  stage: MatchStage;
  homeSlotLabel: string;
  awaySlotLabel: string;
  venue: string;
  city: string;
};

const knockoutFixtureSeed: KnockoutFixtureSeed[] = [
  { matchNumber: 73, date: "2026-06-28", stage: "Round of 32", homeSlotLabel: "Group A runners-up", awaySlotLabel: "Group B runners-up", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 74, date: "2026-06-29", stage: "Round of 32", homeSlotLabel: "Group E winners", awaySlotLabel: "Group A/B/C/D/F third place", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 75, date: "2026-06-29", stage: "Round of 32", homeSlotLabel: "Group F winners", awaySlotLabel: "Group C runners-up", venue: "Estadio Monterrey", city: "Monterrey" },
  { matchNumber: 76, date: "2026-06-29", stage: "Round of 32", homeSlotLabel: "Group C winners", awaySlotLabel: "Group F runners-up", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 77, date: "2026-06-30", stage: "Round of 32", homeSlotLabel: "Group I winners", awaySlotLabel: "Group C/D/F/G/H third place", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 78, date: "2026-06-30", stage: "Round of 32", homeSlotLabel: "Group E runners-up", awaySlotLabel: "Group I runners-up", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 79, date: "2026-06-30", stage: "Round of 32", homeSlotLabel: "Group A winners", awaySlotLabel: "Group C/E/F/H/I third place", venue: "Mexico City Stadium", city: "Mexico City" },
  { matchNumber: 80, date: "2026-07-01", stage: "Round of 32", homeSlotLabel: "Group L winners", awaySlotLabel: "Group E/H/I/J/K third place", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 81, date: "2026-07-01", stage: "Round of 32", homeSlotLabel: "Group D winners", awaySlotLabel: "Group B/E/F/I/J third place", venue: "San Francisco Bay Area Stadium", city: "San Francisco Bay Area" },
  { matchNumber: 82, date: "2026-07-01", stage: "Round of 32", homeSlotLabel: "Group G winners", awaySlotLabel: "Group A/E/H/I/J third place", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 83, date: "2026-07-02", stage: "Round of 32", homeSlotLabel: "Group K runners-up", awaySlotLabel: "Group L runners-up", venue: "Toronto Stadium", city: "Toronto" },
  { matchNumber: 84, date: "2026-07-02", stage: "Round of 32", homeSlotLabel: "Group H winners", awaySlotLabel: "Group J runners-up", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 85, date: "2026-07-02", stage: "Round of 32", homeSlotLabel: "Group B winners", awaySlotLabel: "Group E/F/G/I/J third place", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 86, date: "2026-07-03", stage: "Round of 32", homeSlotLabel: "Group J winners", awaySlotLabel: "Group H runners-up", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 87, date: "2026-07-03", stage: "Round of 32", homeSlotLabel: "Group K winners", awaySlotLabel: "Group D/E/I/J/L third place", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 88, date: "2026-07-03", stage: "Round of 32", homeSlotLabel: "Group D runners-up", awaySlotLabel: "Group G runners-up", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 89, date: "2026-07-04", stage: "Round of 16", homeSlotLabel: "Winner match 74", awaySlotLabel: "Winner match 77", venue: "Philadelphia Stadium", city: "Philadelphia" },
  { matchNumber: 90, date: "2026-07-04", stage: "Round of 16", homeSlotLabel: "Winner match 73", awaySlotLabel: "Winner match 75", venue: "Houston Stadium", city: "Houston" },
  { matchNumber: 91, date: "2026-07-05", stage: "Round of 16", homeSlotLabel: "Winner match 76", awaySlotLabel: "Winner match 78", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
  { matchNumber: 92, date: "2026-07-05", stage: "Round of 16", homeSlotLabel: "Winner match 79", awaySlotLabel: "Winner match 80", venue: "Mexico City Stadium", city: "Mexico City" },
  { matchNumber: 93, date: "2026-07-06", stage: "Round of 16", homeSlotLabel: "Winner match 83", awaySlotLabel: "Winner match 84", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 94, date: "2026-07-06", stage: "Round of 16", homeSlotLabel: "Winner match 81", awaySlotLabel: "Winner match 82", venue: "Seattle Stadium", city: "Seattle" },
  { matchNumber: 95, date: "2026-07-07", stage: "Round of 16", homeSlotLabel: "Winner match 86", awaySlotLabel: "Winner match 88", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 96, date: "2026-07-07", stage: "Round of 16", homeSlotLabel: "Winner match 85", awaySlotLabel: "Winner match 87", venue: "BC Place Vancouver", city: "Vancouver" },
  { matchNumber: 97, date: "2026-07-09", stage: "Quarterfinal", homeSlotLabel: "Winner match 89", awaySlotLabel: "Winner match 90", venue: "Boston Stadium", city: "Boston" },
  { matchNumber: 98, date: "2026-07-10", stage: "Quarterfinal", homeSlotLabel: "Winner match 93", awaySlotLabel: "Winner match 94", venue: "Los Angeles Stadium", city: "Los Angeles" },
  { matchNumber: 99, date: "2026-07-11", stage: "Quarterfinal", homeSlotLabel: "Winner match 91", awaySlotLabel: "Winner match 92", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 100, date: "2026-07-11", stage: "Quarterfinal", homeSlotLabel: "Winner match 95", awaySlotLabel: "Winner match 96", venue: "Kansas City Stadium", city: "Kansas City" },
  { matchNumber: 101, date: "2026-07-14", stage: "Semifinal", homeSlotLabel: "Winner match 97", awaySlotLabel: "Winner match 98", venue: "Dallas Stadium", city: "Dallas" },
  { matchNumber: 102, date: "2026-07-15", stage: "Semifinal", homeSlotLabel: "Winner match 99", awaySlotLabel: "Winner match 100", venue: "Atlanta Stadium", city: "Atlanta" },
  { matchNumber: 103, date: "2026-07-18", stage: "Third Place", homeSlotLabel: "Runner-up match 101", awaySlotLabel: "Runner-up match 102", venue: "Miami Stadium", city: "Miami" },
  { matchNumber: 104, date: "2026-07-19", stage: "Final", homeSlotLabel: "Winner match 101", awaySlotLabel: "Winner match 102", venue: "New York New Jersey Stadium", city: "New York / New Jersey" },
];

const kickoffTimesEt: Record<number, string> = {
  1: "15:00",
  2: "22:00",
  3: "15:00",
  4: "21:00",
  5: "21:00",
  6: "00:00",
  7: "18:00",
  8: "15:00",
  9: "19:00",
  10: "13:00",
  11: "16:00",
  12: "22:00",
  13: "18:00",
  14: "12:00",
  15: "21:00",
  16: "15:00",
  17: "15:00",
  18: "18:00",
  19: "21:00",
  20: "00:00",
  21: "19:00",
  22: "16:00",
  23: "13:00",
  24: "22:00",
  25: "12:00",
  26: "15:00",
  27: "18:00",
  28: "21:00",
  29: "20:30",
  30: "18:00",
  31: "23:00",
  32: "15:00",
  33: "16:00",
  34: "20:00",
  35: "13:00",
  36: "00:00",
  37: "18:00",
  38: "12:00",
  39: "15:00",
  40: "21:00",
  41: "20:00",
  42: "17:00",
  43: "13:00",
  44: "23:00",
  45: "16:00",
  46: "19:00",
  47: "13:00",
  48: "22:00",
  49: "18:00",
  50: "18:00",
  51: "15:00",
  52: "15:00",
  53: "21:00",
  54: "21:00",
  55: "16:00",
  56: "16:00",
  57: "19:00",
  58: "19:00",
  59: "22:00",
  60: "22:00",
  61: "15:00",
  62: "15:00",
  63: "23:00",
  64: "23:00",
  65: "20:00",
  66: "20:00",
  67: "17:00",
  68: "17:00",
  69: "22:00",
  70: "22:00",
  71: "19:30",
  72: "19:30",
  73: "15:00",
  74: "16:30",
  75: "21:00",
  76: "13:00",
  77: "17:00",
  78: "13:00",
  79: "21:00",
  80: "12:00",
  81: "20:00",
  82: "16:00",
  83: "19:00",
  84: "15:00",
  85: "23:00",
  86: "18:00",
  87: "21:30",
  88: "14:00",
  89: "17:00",
  90: "13:00",
  91: "16:00",
  92: "20:00",
  93: "15:00",
  94: "20:00",
  95: "12:00",
  96: "16:00",
  97: "16:00",
  98: "15:00",
  99: "17:00",
  100: "21:00",
  101: "15:00",
  102: "15:00",
  103: "17:00",
  104: "15:00",
};

function fixtureKickoff(date: string, matchNumber: number) {
  const kickoffTime = kickoffTimesEt[matchNumber] ?? "00:00";

  if (kickoffTime === "00:00") {
    const kickoffDate = new Date(`${date}T00:00:00-04:00`);
    kickoffDate.setDate(kickoffDate.getDate() + 1);
    const shiftedDate = kickoffDate.toISOString().slice(0, 10);

    return `${shiftedDate}T00:00:00-04:00`;
  }

  return `${date}T${kickoffTime}:00-04:00`;
}

function groupFixtureToMatch(fixture: GroupFixtureSeed): Match {
  return {
    id: `m${fixture.matchNumber}`,
    stage: "Group Stage",
    matchdayLabel: `Match ${fixture.matchNumber} - Group ${fixture.groupId.toUpperCase()}`,
    kickoff: fixtureKickoff(fixture.date, fixture.matchNumber),
    venue: fixture.venue,
    city: fixture.city,
    homeTeamId: fixture.homeTeamId,
    awayTeamId: fixture.awayTeamId,
    groupId: fixture.groupId,
  };
}

function knockoutFixtureToMatch(fixture: KnockoutFixtureSeed): Match {
  return {
    id: `m${fixture.matchNumber}`,
    stage: fixture.stage,
    matchdayLabel: `Match ${fixture.matchNumber}`,
    kickoff: fixtureKickoff(fixture.date, fixture.matchNumber),
    venue: fixture.venue,
    city: fixture.city,
    homeSlotLabel: fixture.homeSlotLabel,
    awaySlotLabel: fixture.awaySlotLabel,
  };
}

export const matches: Match[] = [
  ...groupFixtureSeed.map(groupFixtureToMatch),
  ...knockoutFixtureSeed.map(knockoutFixtureToMatch),
];

export const standingsByGroup: Record<string, GroupStanding[]> = Object.fromEntries(
  tournamentGroups.map((group) => [
    group.id,
    group.teamIds.map((teamId) => ({
      teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalDifference: 0,
      points: 0,
    })),
  ]),
);

export const currentUser: AppUser = {
  id: "user-1",
  displayName: "Maya Thompson",
  email: "maya@example.com",
  username: "mayapicks",
  supportedTeamId: "japan",
};

export const friendPools: FriendPool[] = [
  {
    id: "harbor-picks",
    name: "Harbor Picks",
    inviteCode: "HARBOR2026",
    scoringMode: "upset",
    privacy: "public",
    maxBracketsPerPlayer: 1,
    allowJoinAfterLock: true,
    members: [
      {
        id: "user-1",
        displayName: "Maya Thompson",
        username: "mayapicks",
        supportedTeamId: "japan",
        predictionStatus: "In progress",
      },
      {
        id: "user-2",
        displayName: "Luca Marin",
        username: "lucascore",
        supportedTeamId: "england",
        predictionStatus: "Submitted",
      },
      {
        id: "user-3",
        displayName: "Ari Campbell",
        username: "ariongoal",
        supportedTeamId: "canada",
        predictionStatus: "Not started",
      },
      {
        id: "user-4",
        displayName: "Sofia Reyes",
        username: "sofiasets",
        supportedTeamId: "mexico",
        predictionStatus: "In progress",
      },
    ],
  },
];

export function getTeamById(teamId: string) {
  return teams.find((team) => team.id === teamId);
}

export function getGroupById(groupId: string) {
  return tournamentGroups.find((group) => group.id === groupId);
}

export function getMatchesByStage(stage: MatchStage) {
  return matches.filter((match) => match.stage === stage);
}

export function getMatchesForGroup(groupId: string) {
  return matches.filter((match) => match.groupId === groupId);
}

export function getMatchesForTeam(teamId: string) {
  return matches.filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
}

export function getFriendPoolById(poolId: string) {
  return friendPools.find((pool) => pool.id === poolId);
}

export function formatKickoff(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(new Date(isoDate));
}
