import { mkdir, writeFile } from "node:fs/promises";

const login = process.env.PROFILE_LOGIN || "2023Anita";
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const outputPath = process.env.ACTIVITY_CARD_PATH || "assets/open-source-activity.svg";
const now = new Date();
const year = Number(process.env.ACTIVITY_YEAR || now.getUTCFullYear());

if (!token) {
  throw new Error("GITHUB_TOKEN or GH_TOKEN is required to query GitHub GraphQL.");
}

const from = `${year}-01-01T00:00:00Z`;
const to = `${year}-12-31T23:59:59Z`;

const query = `
query($login:String!, $from:DateTime!, $to:DateTime!) {
  user(login:$login) {
    contributionsCollection(from:$from, to:$to) {
      contributionCalendar { totalContributions }
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoriesWithContributedCommits
      totalRepositoriesWithContributedIssues
      totalRepositoriesWithContributedPullRequests
      totalRepositoriesWithContributedPullRequestReviews
    }
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "2023Anita-profile-activity-card",
  },
  body: JSON.stringify({ query, variables: { login, from, to } }),
});

if (!response.ok) {
  throw new Error(`GitHub GraphQL request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
if (payload.errors?.length) {
  throw new Error(payload.errors.map((error) => error.message).join("; "));
}

const collection = payload.data?.user?.contributionsCollection;
if (!collection) {
  throw new Error(`No contributionsCollection returned for ${login}.`);
}

const stats = {
  total: collection.contributionCalendar.totalContributions,
  commits: collection.totalCommitContributions,
  issues: collection.totalIssueContributions,
  pullRequests: collection.totalPullRequestContributions,
  reviews: collection.totalPullRequestReviewContributions,
  activeRepos: Math.max(
    collection.totalRepositoriesWithContributedCommits,
    collection.totalRepositoriesWithContributedIssues,
    collection.totalRepositoriesWithContributedPullRequests,
    collection.totalRepositoriesWithContributedPullRequestReviews,
  ),
};

const compositionTotal = stats.commits + stats.issues + stats.pullRequests + stats.reviews;
const pct = (value) => (compositionTotal > 0 ? Math.round((value / compositionTotal) * 100) : 0);
const percentages = {
  commits: pct(stats.commits),
  issues: pct(stats.issues),
  pullRequests: pct(stats.pullRequests),
  reviews: pct(stats.reviews),
};

const radius = 144;
const left = Math.round((percentages.commits / 100) * radius);
const right = Math.round((percentages.issues / 100) * radius);
const down = Math.round((percentages.pullRequests / 100) * radius);
const up = Math.round((percentages.reviews / 100) * radius);
const polygonPoints = `-${left},0 0,${down} ${right},0 0,-${up}`;
const generatedDate = now.toISOString().slice(0, 10);

const escapeXml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[char]);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="420" viewBox="0 0 1040 420" role="img" aria-labelledby="title desc">
  <title id="title">${year} open-source activity snapshot for Lixin Yin</title>
  <desc id="desc">A polished contribution composition card showing ${stats.total} public GitHub contributions in ${year}, including commits, pull requests, issues, and code reviews. Last updated ${generatedDate}.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="0.52" stop-color="#111827"/>
      <stop offset="1" stop-color="#062f35"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.03"/>
    </linearGradient>
    <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7ee787" stop-opacity="0.72"/>
      <stop offset="1" stop-color="#2dd4bf" stop-opacity="0.34"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000000" flood-opacity="0.34"/>
    </filter>
    <style>
      .label{font:600 18px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#e6edf3}
      .muted{font:500 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#9aa7b3}
      .small{font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#8b949e;letter-spacing:.08em}
      .number{font:700 46px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#ffffff}
      .metric{font:700 24px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#ffffff}
      .axis{stroke:#234b50;stroke-width:2}
      .grid{stroke:#1f3b42;stroke-width:1.2;fill:none}
    </style>
  </defs>

  <rect width="1040" height="420" rx="28" fill="url(#bg)"/>
  <path d="M0 332 C150 278 236 368 380 300 C543 223 641 239 779 154 C893 84 966 103 1040 42 L1040 420 L0 420 Z" fill="#2dd4bf" opacity="0.08"/>
  <circle cx="880" cy="72" r="156" fill="#7ee787" opacity="0.08"/>
  <circle cx="920" cy="324" r="210" fill="#2dd4bf" opacity="0.06"/>

  <g filter="url(#shadow)">
    <rect x="34" y="34" width="972" height="352" rx="24" fill="url(#panel)" stroke="#2f414d" stroke-width="1"/>
  </g>

  <g transform="translate(68 68)">
    <text class="small" x="0" y="0">OPEN-SOURCE ACTIVITY</text>
    <text class="label" x="0" y="34">${year} public GitHub contribution snapshot</text>
    <text class="muted" x="0" y="62">Medical AI, clinical agent workflows, and reproducible research tooling.</text>

    <g transform="translate(0 98)">
      <rect x="0" y="0" width="154" height="92" rx="18" fill="#0f1b24" stroke="#2f414d"/>
      <text class="number" x="20" y="52">${stats.total}</text>
      <text class="muted" x="20" y="76">contributions</text>

      <rect x="174" y="0" width="154" height="92" rx="18" fill="#0f1b24" stroke="#2f414d"/>
      <text class="number" x="194" y="52">${stats.activeRepos}</text>
      <text class="muted" x="194" y="76">active repos</text>

      <rect x="348" y="0" width="154" height="92" rx="18" fill="#0f1b24" stroke="#2f414d"/>
      <text class="number" x="368" y="52">${stats.pullRequests}</text>
      <text class="muted" x="368" y="76">pull requests</text>
    </g>

    <g transform="translate(0 224)">
      <rect x="0" y="0" width="184" height="42" rx="21" fill="#10251f" stroke="#1f6f46"/>
      <text class="muted" x="20" y="27" fill="#b7f7c1">Clinical AI</text>
      <rect x="198" y="0" width="206" height="42" rx="21" fill="#10232a" stroke="#1d6b73"/>
      <text class="muted" x="218" y="27" fill="#b6f3ef">Agent workflows</text>
      <rect x="418" y="0" width="204" height="42" rx="21" fill="#1f1d12" stroke="#8a6d1d"/>
      <text class="muted" x="438" y="27" fill="#f7df8d">Kaggle life science</text>
    </g>
  </g>

  <g transform="translate(712 210)">
    <circle class="grid" cx="0" cy="0" r="128"/>
    <circle class="grid" cx="0" cy="0" r="88"/>
    <circle class="grid" cx="0" cy="0" r="48"/>
    <line class="axis" x1="0" y1="-144" x2="0" y2="144"/>
    <line class="axis" x1="-144" y1="0" x2="144" y2="0"/>

    <polygon points="${escapeXml(polygonPoints)}" fill="url(#radarFill)" stroke="#7ee787" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="-${left}" cy="0" r="6" fill="#0d1117" stroke="#7ee787" stroke-width="4"/>
    <circle cx="0" cy="${down}" r="6" fill="#0d1117" stroke="#7ee787" stroke-width="4"/>
    <circle cx="${right}" cy="0" r="6" fill="#0d1117" stroke="#7ee787" stroke-width="4"/>
    <circle cx="0" cy="-${up}" r="6" fill="#0d1117" stroke="#7ee787" stroke-width="4"/>

    <text class="metric" x="-198" y="-7" text-anchor="middle">${percentages.commits}%</text>
    <text class="muted" x="-198" y="17" text-anchor="middle">Commits</text>
    <text class="metric" x="0" y="179" text-anchor="middle">${percentages.pullRequests}%</text>
    <text class="muted" x="0" y="203" text-anchor="middle">Pull requests</text>
    <text class="metric" x="191" y="-7" text-anchor="middle">${percentages.issues}%</text>
    <text class="muted" x="191" y="17" text-anchor="middle">Issues</text>
    <text class="metric" x="0" y="-177" text-anchor="middle">${percentages.reviews}%</text>
    <text class="muted" x="0" y="-153" text-anchor="middle">Code review</text>
  </g>
</svg>
`;

await mkdir(outputPath.split("/").slice(0, -1).join("/") || ".", { recursive: true });
await writeFile(outputPath, svg, "utf8");

console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify({
  login,
  year,
  ...stats,
  percentages,
}, null, 2));
