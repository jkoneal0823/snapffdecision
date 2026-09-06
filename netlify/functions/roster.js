// Netlify serverless function — proxies ESPN NFL API
// Bypasses CORS so the browser can fetch live roster data
// Deploy path: netlify/functions/roster.js

const TEAM_IDS = {
  ARI:22, ATL:1,  BAL:33, BUF:2,  CAR:29, CHI:3,  CIN:4,  CLE:5,
  DAL:6,  DEN:7,  DET:8,  GB:9,   HOU:34, IND:11, JAX:30, KC:12,
  LAC:24, LAR:14, LV:13,  MIA:15, MIN:16, NE:17,  NO:18,  NYG:19,
  NYJ:20, PHI:21, PIT:23, SEA:26, SF:25,  TB:27,  TEN:10, WAS:28
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const team = (event.queryStringParameters && event.queryStringParameters.team || '').toUpperCase();

  try {
    const OFF_POSITIONS = new Set(['QB','RB','WR','TE']);
    let players = [];

    if (team && TEAM_IDS[team]) {
      // Fetch single team
      players = await fetchTeamRoster(team, TEAM_IDS[team], OFF_POSITIONS);
    } else {
      // Fetch all 32 teams in parallel
      const fetches = Object.entries(TEAM_IDS).map(([abbr, id]) =>
        fetchTeamRoster(abbr, id, OFF_POSITIONS)
      );
      const results = await Promise.all(fetches);
      players = results.flat();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ players, updated: new Date().toISOString() })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

async function fetchTeamRoster(abbr, teamId, offPositions) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${teamId}/roster`;
  const res  = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();

  const players = [];
  (data.athletes || []).forEach(group => {
    (group.items || []).forEach(athlete => {
      const pos = athlete.position && athlete.position.abbreviation;
      if (!offPositions.has(pos)) return;

      const injury = athlete.injuries && athlete.injuries[0];
      players.push({
        name:   athlete.fullName || '',
        pos,
        team:   abbr,
        age:    athlete.age || null,
        jersey: athlete.jersey || null,
        status: injury
          ? (injury.status || injury.type && injury.type.description || 'Injured')
          : 'Active',
        espnId: athlete.id
      });
    });
  });
  return players;
}
