export type PositionCode = "QB" | "RB" | "FB" | "WR" | "TE" | "LT" | "LG" | "C" | "RG" | "RT";

export type PlayerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: PositionCode;
  depth: 1 | 2 | 3;
  status: "active" | "limited" | "inactive";
  overall: number;
  metrics: {
    receptionsPerGame?: number;
    receivingYardsPerGame?: number;
    yardsPerRoute?: number;
    pffGrade: number;
  };
};

export type FormationSlot = {
  id: string;
  label: PositionCode;
  starterId: string;
  backupId?: string;
  x: number;
  y: number;
};

export const playerProfiles: PlayerProfile[] = [
  { id: "p09", firstName: "Jonas", lastName: "Keller", number: 9, position: "QB", depth: 1, status: "active", overall: 85.3, metrics: { pffGrade: 84.8 } },
  { id: "p12", firstName: "Timo", lastName: "Fischer", number: 12, position: "QB", depth: 2, status: "active", overall: 68.3, metrics: { pffGrade: 67.4 } },
  { id: "p28", firstName: "Noah", lastName: "Schmidt", number: 28, position: "RB", depth: 1, status: "active", overall: 75.0, metrics: { pffGrade: 74.5 } },
  { id: "p29", firstName: "Luca", lastName: "Braun", number: 29, position: "RB", depth: 2, status: "active", overall: 67.8, metrics: { pffGrade: 66.9 } },
  { id: "p34", firstName: "David", lastName: "Weber", number: 34, position: "FB", depth: 1, status: "active", overall: 71.8, metrics: { pffGrade: 70.4 } },
  { id: "p35", firstName: "Nico", lastName: "Frank", number: 35, position: "FB", depth: 2, status: "active", overall: 65.9, metrics: { pffGrade: 64.8 } },
  { id: "p81", firstName: "Leon", lastName: "Wagner", number: 81, position: "WR", depth: 1, status: "active", overall: 78.6, metrics: { receptionsPerGame: 5.1, receivingYardsPerGame: 68.4, yardsPerRoute: 2.32, pffGrade: 79.2 } },
  { id: "p15", firstName: "Paul", lastName: "Neumann", number: 15, position: "WR", depth: 2, status: "active", overall: 72.4, metrics: { receptionsPerGame: 3.2, receivingYardsPerGame: 41.7, yardsPerRoute: 1.88, pffGrade: 71.8 } },
  { id: "p11", firstName: "Elias", lastName: "Hartmann", number: 11, position: "WR", depth: 1, status: "active", overall: 82.1, metrics: { receptionsPerGame: 5.8, receivingYardsPerGame: 77.2, yardsPerRoute: 2.47, pffGrade: 83.1 } },
  { id: "p82", firstName: "Jan", lastName: "Vogel", number: 82, position: "WR", depth: 2, status: "limited", overall: 67.1, metrics: { receptionsPerGame: 2.1, receivingYardsPerGame: 27.3, yardsPerRoute: 1.54, pffGrade: 66.7 } },
  { id: "p87", firstName: "Max", lastName: "Berger", number: 87, position: "TE", depth: 1, status: "active", overall: 82.1, metrics: { receptionsPerGame: 4.6, receivingYardsPerGame: 60.2, yardsPerRoute: 2.25, pffGrade: 80.1 } },
  { id: "p88", firstName: "Chris", lastName: "Davis", number: 88, position: "TE", depth: 2, status: "active", overall: 73.4, metrics: { receptionsPerGame: 1.8, receivingYardsPerGame: 21.6, yardsPerRoute: 1.62, pffGrade: 71.2 } },
  { id: "p72", firstName: "Finn", lastName: "Maier", number: 72, position: "LT", depth: 1, status: "active", overall: 73.5, metrics: { pffGrade: 74.1 } },
  { id: "p71", firstName: "Ben", lastName: "König", number: 71, position: "LT", depth: 2, status: "active", overall: 66.9, metrics: { pffGrade: 65.8 } },
  { id: "p65", firstName: "Moritz", lastName: "Huber", number: 65, position: "LG", depth: 1, status: "active", overall: 76.4, metrics: { pffGrade: 76.9 } },
  { id: "p68", firstName: "Robin", lastName: "Lang", number: 68, position: "LG", depth: 2, status: "active", overall: 66.9, metrics: { pffGrade: 66.3 } },
  { id: "p60", firstName: "Felix", lastName: "Koch", number: 60, position: "C", depth: 1, status: "active", overall: 80.6, metrics: { pffGrade: 81.4 } },
  { id: "p62", firstName: "Simon", lastName: "Wolf", number: 62, position: "C", depth: 2, status: "active", overall: 66.0, metrics: { pffGrade: 65.7 } },
  { id: "p66", firstName: "Mika", lastName: "Roth", number: 66, position: "RG", depth: 1, status: "active", overall: 75.0, metrics: { pffGrade: 75.6 } },
  { id: "p67", firstName: "Tom", lastName: "Lehmann", number: 67, position: "RG", depth: 2, status: "active", overall: 66.5, metrics: { pffGrade: 65.9 } },
  { id: "p75", firstName: "Liam", lastName: "Schulz", number: 75, position: "RT", depth: 1, status: "active", overall: 76.1, metrics: { pffGrade: 76.4 } },
  { id: "p74", firstName: "Erik", lastName: "Baumann", number: 74, position: "RT", depth: 2, status: "active", overall: 66.7, metrics: { pffGrade: 66.2 } },
];

export const base11Personnel: FormationSlot[] = [
  { id: "wr-left", label: "WR", starterId: "p81", backupId: "p15", x: 20, y: 23 },
  { id: "te", label: "TE", starterId: "p87", backupId: "p88", x: 24, y: 46 },
  { id: "lt", label: "LT", starterId: "p72", backupId: "p71", x: 35, y: 45 },
  { id: "lg", label: "LG", starterId: "p65", backupId: "p68", x: 43, y: 45 },
  { id: "c", label: "C", starterId: "p60", backupId: "p62", x: 50, y: 45 },
  { id: "rg", label: "RG", starterId: "p66", backupId: "p67", x: 57, y: 45 },
  { id: "rt", label: "RT", starterId: "p75", backupId: "p74", x: 65, y: 45 },
  { id: "wr-right", label: "WR", starterId: "p11", backupId: "p82", x: 80, y: 23 },
  { id: "qb", label: "QB", starterId: "p09", backupId: "p12", x: 50, y: 68 },
  { id: "rb", label: "RB", starterId: "p28", backupId: "p29", x: 42, y: 84 },
  { id: "fb", label: "FB", starterId: "p34", backupId: "p35", x: 58, y: 84 },
];

export const performanceCards = [
  { label: "Gesamt Offense Rating", value: "78.4", rank: 3, trend: [7, 10, 8, 5, 7, 6, 7, 8, 6, 8, 7] },
  { label: "Points per Game", value: "32.6", rank: 2, trend: [4, 7, 10, 7, 5, 4, 8, 10, 9, 11, 10] },
  { label: "Yards per Game", value: "426.8", rank: 4, trend: [5, 7, 9, 7, 9, 8, 10, 11, 12, 11, 14] },
  { label: "First Downs per Game", value: "24.8", rank: 3, trend: [4, 6, 7, 9, 7, 10, 8, 11, 12, 10, 13] },
  { label: "Red Zone (TD%)", value: "68%", rank: 2, trend: [7, 10, 9, 12, 11, 13, 12, 14, 13, 15, 14] },
  { label: "Turnover Margin", value: "+0.8", rank: 6, trend: [5, 5, 7, 8, 6, 10, 9, 12, 11, 13, 13] },
];

export const snapshots = [
  { label: "Week 6 vs. Bulldogs", date: "11.10.2026", rating: 78.1 },
  { label: "Week 5 vs. Falcons", date: "03.10.2026", rating: 76.7 },
  { label: "Week 4 vs. Hawks", date: "26.09.2026", rating: 74.9 },
  { label: "Week 3 vs. Rangers", date: "19.09.2026", rating: 75.3 },
  { label: "Week 2 vs. Pioneers", date: "12.09.2026", rating: 73.8 },
];

