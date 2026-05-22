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

const radius = 108;
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
  <desc id="desc">A clean GitHub-style contribution overview showing ${stats.total} public GitHub contributions in ${year}, including commits, pull requests, issues, and code reviews. Last updated ${generatedDate}.</desc>
  <defs>
    <linearGradient id="surface" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fffdf8"/>
      <stop offset="0.58" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eef7ff"/>
    </linearGradient>
    <radialGradient id="soft-aura" cx="70%" cy="31%" r="58%">
      <stop offset="0" stop-color="#fef3c7" stop-opacity="0.78"/>
      <stop offset="0.48" stop-color="#dbeafe" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <style>
      .title{font:700 25px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#24292f}
      .subtle{font:500 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#57606a}
      .section{font:700 17px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#24292f}
      .chip{font:650 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#24292f}
      .value{font:760 38px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#24292f}
      .value-small{font:760 21px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#24292f}
      .label{font:560 13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;fill:#57606a}
      .axis{stroke:#d0d7de;stroke-width:1.25;stroke-linecap:round}
      .grid{stroke:#d8dee4;stroke-width:1;fill:none}
      .warm{stroke:#f59e0b;stroke-width:1.6;stroke-linecap:round;fill:none;opacity:.28}
      .cool{stroke:#54aeef;stroke-width:1.6;stroke-linecap:round;fill:none;opacity:.25}
    </style>
  </defs>

  <rect x="0.5" y="0.5" width="1039" height="419" rx="22" fill="url(#surface)" stroke="#d0d7de"/>
  <rect x="30" y="30" width="980" height="360" rx="16" fill="#ffffff" stroke="#d8dee4"/>
  <circle cx="742" cy="130" r="190" fill="url(#soft-aura)"/>
  <path class="warm" d="M642 70 C710 35 810 40 905 92"/>
  <path class="cool" d="M618 343 C700 304 842 304 958 342"/>

  <g transform="translate(64 64)">
    <text class="title" x="0" y="0">${stats.total.toLocaleString("en-US")} contributions in ${year}</text>
    <text class="subtle" x="0" y="29">Medical AI, clinical agent workflows, Kaggle life science, and reproducible research tooling.</text>

    <g transform="translate(0 68)">
      <text class="subtle" x="0" y="0">Jan</text><text class="subtle" x="72" y="0">Feb</text><text class="subtle" x="144" y="0">Mar</text><text class="subtle" x="216" y="0">Apr</text><text class="subtle" x="288" y="0">May</text><text class="subtle" x="360" y="0">Jun</text><text class="subtle" x="432" y="0">Jul</text>
      ${Array.from({ length: 31 }, (_, col) => Array.from({ length: 5 }, (_, row) => {
        const level = (col + row + stats.total) % 5;
        const colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
        return `<rect x="${col * 18}" y="${18 + row * 17}" width="12" height="12" rx="3" fill="${colors[level]}"/>`;
      }).join("")).join("")}
      <text class="subtle" x="0" y="128">Less</text>
      <rect x="42" y="118" width="12" height="12" rx="3" fill="#ebedf0"/>
      <rect x="62" y="118" width="12" height="12" rx="3" fill="#9be9a8"/>
      <rect x="82" y="118" width="12" height="12" rx="3" fill="#40c463"/>
      <rect x="102" y="118" width="12" height="12" rx="3" fill="#30a14e"/>
      <rect x="122" y="118" width="12" height="12" rx="3" fill="#216e39"/>
      <text class="subtle" x="144" y="128">More</text>
    </g>

    <line x1="0" y1="226" x2="902" y2="226" stroke="#d8dee4"/>

    <g transform="translate(0 270)">
      <rect x="0" y="-24" width="126" height="38" rx="9" fill="#ffffff" stroke="#d0d7de"/>
      <text class="chip" x="18" y="0">@2023Anita</text>
      <rect x="146" y="-24" width="150" height="38" rx="9" fill="#ffffff" stroke="#d0d7de"/>
      <text class="chip" x="164" y="0">Medical AI</text>
      <rect x="316" y="-24" width="178" height="38" rx="9" fill="#ffffff" stroke="#d0d7de"/>
      <text class="chip" x="334" y="0">Agent workflows</text>
      <rect x="514" y="-24" width="190" height="38" rx="9" fill="#ffffff" stroke="#d0d7de"/>
      <text class="chip" x="532" y="0">Kaggle life science</text>
    </g>
  </g>

  <g transform="translate(72 330)">
    <text class="section" x="0" y="0">Activity overview</text>
    <text class="label" x="0" y="34">Contributed across ${stats.activeRepos} public repositories</text>
    <text class="value-small" x="0" y="78">${stats.commits}</text><text class="label" x="36" y="78">commits</text>
    <text class="value-small" x="138" y="78">${stats.pullRequests}</text><text class="label" x="174" y="78">pull requests</text>
    <text class="value-small" x="318" y="78">${stats.issues}</text><text class="label" x="342" y="78">issues</text>
  </g>

  <g transform="translate(824 218)">
    <circle class="grid" cx="0" cy="0" r="108"/>
    <circle class="grid" cx="0" cy="0" r="72"/>
    <circle class="grid" cx="0" cy="0" r="36"/>
    <line class="axis" x1="0" y1="-122" x2="0" y2="122"/>
    <line class="axis" x1="-122" y1="0" x2="122" y2="0"/>

    <polygon points="${escapeXml(polygonPoints)}" fill="#facc15" fill-opacity="0.28" stroke="#ea580c" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="-${left}" cy="0" r="5" fill="#ffffff" stroke="#ea580c" stroke-width="3"/>
    <circle cx="0" cy="${down}" r="5" fill="#ffffff" stroke="#ea580c" stroke-width="3"/>
    <circle cx="${right}" cy="0" r="5" fill="#ffffff" stroke="#ea580c" stroke-width="3"/>
    <circle cx="0" cy="-${up}" r="5" fill="#ffffff" stroke="#ea580c" stroke-width="3"/>

    <text class="value-small" x="-164" y="-6" text-anchor="middle">${percentages.commits}%</text>
    <text class="muted" x="-164" y="17" text-anchor="middle">Commits</text>
    <text class="value-small" x="0" y="151" text-anchor="middle">${percentages.pullRequests}%</text>
    <text class="muted" x="0" y="174" text-anchor="middle">Pull requests</text>
    <text class="value-small" x="154" y="-6" text-anchor="middle">${percentages.issues}%</text>
    <text class="muted" x="154" y="17" text-anchor="middle">Issues</text>
    <text class="value-small" x="0" y="-146" text-anchor="middle">${percentages.reviews}%</text>
    <text class="muted" x="0" y="-123" text-anchor="middle">Code review</text>
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
