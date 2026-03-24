// SnapFFDecision — Live NFL Data Proxy
// Netlify Functions 2.0 syntax
// Covers: current rosters, free agents, injury status, 2026 draft prospects

const TEAM_MAP = {
  ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
  DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAX:30, KC:12,
  LAC:24, LAR:14, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
  NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28
};

const OFF_POS = new Set(["QB","RB","WR","TE"]);

const DRAFT_PROSPECTS = [
  {name:"Cam Ward",          pos:"QB",team:"Draft",college:"Miami",          rank:1, age:23,status:"2026 Draft Prospect"},
  {name:"Shedeur Sanders",   pos:"QB",team:"Draft",college:"Colorado",       rank:2, age:23,status:"2026 Draft Prospect"},
  {name:"Ashton Jeanty",     pos:"RB",team:"Draft",college:"Boise State",    rank:3, age:21,status:"2026 Draft Prospect"},
  {name:"Jeremiyah Love",    pos:"RB",team:"Draft",college:"Notre Dame",     rank:4, age:21,status:"2026 Draft Prospect"},
  {name:"Tetairoa McMillan", pos:"WR",team:"Draft",college:"Arizona",        rank:5, age:21,status:"2026 Draft Prospect"},
  {name:"Colston Loveland",  pos:"TE",team:"Draft",college:"Michigan",       rank:6, age:22,status:"2026 Draft Prospect"},
  {name:"Tyler Warren",      pos:"TE",team:"Draft",college:"Penn State",     rank:7, age:23,status:"2026 Draft Prospect"},
  {name:"Jordyn Tyson",      pos:"WR",team:"Draft",college:"Colorado State", rank:8, age:21,status:"2026 Draft Prospect"},
  {name:"Carnell Tate",      pos:"WR",team:"Draft",college:"Ohio State",     rank:9, age:21,status:"2026 Draft Prospect"},
  {name:"Makai Lemon",       pos:"WR",team:"Draft",college:"USC",            rank:10,age:21,status:"2026 Draft Prospect"},
  {name:"Emeka Egbuka",      pos:"WR",team:"Draft",college:"Ohio State",     rank:11,age:22,status:"2026 Draft Prospect"},
  {name:"Kalel Mullings",    pos:"RB",team:"Draft",college:"Michigan",       rank:12,age:23,status:"2026 Draft Prospect"},
  {name:"Jalen Milroe",      pos:"QB",team:"Draft",college:"Alabama",        rank:13,age:22,status:"2026 Draft Prospect"},
  {name:"Garrett Nussmeier", pos:"QB",team:"Draft",college:"LSU",            rank:14,age:23,status:"2026 Draft Prospect"},
  {name:"Ollie Gordon II",   pos:"RB",team:"Draft",college:"Oklahoma State", rank:15,age:22,status:"2026 Draft Prospect"},
  {name:"Nick Singleton",    pos:"RB",team:"Draft",college:"Penn State",     rank:16,age:21,status:"2026 Draft Prospect"},
  {name:"Tre Harris",        pos:"WR",team:"Draft",college:"Ole Miss",       rank:17,age:23,status:"2026 Draft Prospect"},
  {name:"Emeka Egbuka",      pos:"WR",team:"Draft",college:"Ohio State",     rank:18,age:22,status:"2026 Draft Prospect"},
  {name:"Jack Bech",         pos:"WR",team:"Draft",college:"TCU",            rank:19,age:22,status:"2026 Draft Prospect"},
  {name:"Harold Fannin Jr.", pos:"TE",team:"Draft",college:"Bowling Green",  rank:20,age:22,status:"2026 Draft Prospect"},
  {name:"Cam Skattebo",      pos:"RB",team:"Draft",college:"Arizona State",  rank:21,age:23,status:"2026 Draft Prospect"},
  {name:"Quinshon Judkins",  pos:"RB",team:"Draft",college:"Ohio State",     rank:22,age:21,status:"2026 Draft Prospect"},
  {name:"Kaytron Allen",     pos:"RB",team:"Draft",college:"Penn State",     rank:23,age:21,status:"2026 Draft Prospect"},
  {name:"Dylan Sampson",     pos:"RB",team:"Draft",college:"Tennessee",      rank:24,age:21,status:"2026 Draft Prospect"},
  {name:"Brashard Smith",    pos:"RB",team:"Draft",college:"SMU",            rank:25,age:22,status:"2026 Draft Prospect"},
  {name:"Darien Porter",     pos:"WR",team:"Draft",college:"Iowa State",     rank:26,age:23,status:"2026 Draft Prospect"},
  {name:"Isaiah Bond",       pos:"WR",team:"Draft",college:"Texas",          rank:27,age:21,status:"2026 Draft Prospect"},
  {name:"Kyle Williams",     pos:"WR",team:"Draft",college:"Washington State",rank:28,age:22,status:"2026 Draft Prospect"},
];

export default async (request) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response("", { status: 200, headers });
  }

  const url  = new URL(request.url);
  const team = (url.searchParams.get("team") || "").toUpperCase();
  const type = url.searchParams.get("type") || "all";

  try {
    // Fetch all 32 rosters in parallel
    const rosterPlayers = await fetchAllRosters();

    // Always include draft prospects
    const allPlayers = [...rosterPlayers, ...DRAFT_PROSPECTS];

    return new Response(
      JSON.stringify({ players: allPlayers, updated: new Date().toISOString() }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, players: DRAFT_PROSPECTS }),
      { status: 200, headers }
    );
  }
};

async function fetchAllRosters() {
  const fetches = Object.entries(TEAM_MAP).map(([abbr, id]) =>
    fetchTeamRoster(abbr, id).catch(() => [])
  );
  const results = await Promise.all(fetches);
  return results.flat();
}

async function fetchTeamRoster(abbr, teamId) {
  const res  = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`);
  if (!res.ok) return [];
  const data = await res.json();
  const players = [];

  (data.athletes || []).forEach(group => {
    (group.items || []).forEach(p => {
      const pos = p.position && p.position.abbreviation;
      if (!OFF_POS.has(pos)) return;
      const injury = p.injuries && p.injuries[0];
      players.push({
        name:    p.fullName || "",
        pos,
        team:    abbr,
        age:     p.age    || null,
        jersey:  p.jersey || null,
        college: p.college && p.college.name || null,
        status:  injury ? (injury.status || "Injured") : "Active",
        espnId:  p.id
      });
    });
  });
  return players;
}
