export interface OfficialPlayerStanding {
  rank: number;
  name: string;
  pld: number;
  w: number;
  d: number;
  l: number;
  pts: number;
  ppg: number;
}

export const OFFICIAL_PLAYER_STANDINGS: OfficialPlayerStanding[] = [
  { rank: 1, name: "Jerry", pld: 15, w: 5, d: 7, l: 3, pts: 22, ppg: 1.5 },
  { rank: 2, name: "John", pld: 14, w: 4, d: 9, l: 1, pts: 21, ppg: 1.5 },
  { rank: 3, name: "Charles", pld: 18, w: 4, d: 9, l: 5, pts: 21, ppg: 1.2 },
  { rank: 4, name: "Tumishe", pld: 12, w: 4, d: 7, l: 1, pts: 19, ppg: 1.6 },
  { rank: 5, name: "Tunde", pld: 13, w: 3, d: 7, l: 3, pts: 16, ppg: 1.2 },
  { rank: 6, name: "David", pld: 11, w: 3, d: 6, l: 2, pts: 15, ppg: 1.4 },
  { rank: 7, name: "ND", pld: 9, w: 4, d: 3, l: 2, pts: 15, ppg: 1.7 },
  { rank: 8, name: "Shola", pld: 9, w: 3, d: 5, l: 1, pts: 14, ppg: 1.6 },
  { rank: 9, name: "Ibraheem", pld: 12, w: 2, d: 6, l: 4, pts: 12, ppg: 1.0 },
  { rank: 10, name: "Osanga", pld: 11, w: 2, d: 6, l: 3, pts: 12, ppg: 1.1 },
  { rank: 11, name: "Alive", pld: 8, w: 2, d: 5, l: 1, pts: 11, ppg: 1.4 },
  { rank: 12, name: "Solomon", pld: 10, w: 2, d: 5, l: 3, pts: 11, ppg: 1.1 },
  { rank: 13, name: "Dodo", pld: 7, w: 2, d: 5, l: 0, pts: 11, ppg: 1.6 },
  { rank: 14, name: "Kennedy", pld: 9, w: 2, d: 4, l: 3, pts: 10, ppg: 1.1 },
  { rank: 15, name: "Ojukwu", pld: 12, w: 1, d: 7, l: 4, pts: 10, ppg: 0.8 },
  { rank: 16, name: "Skipo", pld: 5, w: 2, d: 3, l: 0, pts: 9, ppg: 1.8 },
  { rank: 17, name: "Mayor", pld: 6, w: 2, d: 3, l: 1, pts: 9, ppg: 1.5 },
  { rank: 18, name: "Tomi", pld: 7, w: 1, d: 6, l: 0, pts: 9, ppg: 1.3 },
  { rank: 19, name: "Nnamdi", pld: 9, w: 1, d: 5, l: 3, pts: 8, ppg: 0.9 },
  { rank: 20, name: "Odum", pld: 7, w: 1, d: 5, l: 1, pts: 8, ppg: 1.1 },
  { rank: 21, name: "Ike (New)", pld: 6, w: 1, d: 4, l: 1, pts: 7, ppg: 1.2 },
  { rank: 22, name: "John T", pld: 5, w: 1, d: 4, l: 0, pts: 7, ppg: 1.4 },
  { rank: 23, name: "Diki", pld: 4, w: 2, d: 1, l: 1, pts: 7, ppg: 1.8 },
  { rank: 24, name: "Success", pld: 4, w: 2, d: 0, l: 2, pts: 6, ppg: 1.5 },
  { rank: 25, name: "TJ", pld: 4, w: 1, d: 2, l: 1, pts: 5, ppg: 1.3 },
  { rank: 26, name: "Vincent", pld: 6, w: 0, d: 4, l: 2, pts: 4, ppg: 0.7 },
  { rank: 27, name: "Tosin", pld: 4, w: 0, d: 4, l: 0, pts: 4, ppg: 1.0 },
  { rank: 28, name: "Kester", pld: 3, w: 1, d: 0, l: 2, pts: 3, ppg: 1.0 },
  { rank: 29, name: "Kosi", pld: 3, w: 0, d: 3, l: 0, pts: 3, ppg: 1.0 },
  { rank: 30, name: "Deco", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 31, name: "Alex", pld: 4, w: 0, d: 3, l: 1, pts: 3, ppg: 0.8 },
  { rank: 32, name: "Destiny", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 33, name: "Stafoo", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 34, name: "George", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 35, name: "Ugo", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 36, name: "Juwal", pld: 2, w: 1, d: 0, l: 1, pts: 3, ppg: 1.5 },
  { rank: 37, name: "Philip", pld: 2, w: 1, d: 0, l: 1, pts: 3, ppg: 1.5 },
  { rank: 38, name: "Emeka", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 39, name: "Frank", pld: 1, w: 1, d: 0, l: 0, pts: 3, ppg: 3.0 },
  { rank: 40, name: "Pablo", pld: 3, w: 1, d: 0, l: 2, pts: 3, ppg: 1.0 },
  { rank: 41, name: "Chinedu", pld: 4, w: 0, d: 2, l: 2, pts: 2, ppg: 0.5 },
  { rank: 42, name: "Dennis", pld: 2, w: 0, d: 2, l: 0, pts: 2, ppg: 1.0 },
  { rank: 43, name: "Igwe", pld: 2, w: 0, d: 1, l: 1, pts: 1, ppg: 0.5 },
  { rank: 44, name: "Geoffrey", pld: 1, w: 0, d: 1, l: 0, pts: 1, ppg: 1.0 },
  { rank: 45, name: "Sheriff", pld: 3, w: 0, d: 1, l: 2, pts: 1, ppg: 0.3 },
  { rank: 46, name: "Jeff", pld: 1, w: 0, d: 1, l: 0, pts: 1, ppg: 1.0 },
  { rank: 47, name: "Ike", pld: 1, w: 0, d: 1, l: 0, pts: 1, ppg: 1.0 },
  { rank: 48, name: "Obi", pld: 3, w: 0, d: 1, l: 2, pts: 1, ppg: 0.3 }
];
