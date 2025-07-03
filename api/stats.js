// Vercel Serverless Function: /api/stats
// Returns stats for predefined org/repos using GitHub APIs.

export default async function handler(req, res) {
  const ORG = "nst-sdc";
  const REPOS = [
    "Campus-Buddy",
    "Anonymous_Question_Asking-Platform",
    "-H-ckollab",
    "LinkUp.AI",
    "Personalized-Academic-Tracker",
    "NotesShaaring-Platform",
    "Screentime-recoder",
    "Fix-Time",
    "Shuttle_Tracker",
    "VS-code-Extension"
  ];

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GITHUB_TOKEN env not set" });
  }
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
  };

  const rows = [];
  try {
    for (const repo of REPOS) {
      const full = `${ORG}/${repo}`;
      const repoUrl = `https://api.github.com/repos/${full}`;
      const prsOpenUrl = `https://api.github.com/repos/${full}/pulls?state=open&per_page=1`;
      const gqlQuery = {
        query: `query($owner:String!, $name:String!){
          repository(owner:$owner, name:$name){
            pullRequests(states:MERGED){ totalCount }
            issues(states:CLOSED){ totalCount }
          }
        }`,
        variables: { owner: ORG, name: repo },
      };

      const [repoResp, openPRsResp, gqlResp] = await Promise.all([
        fetch(repoUrl, { headers }),
        fetch(prsOpenUrl, { headers }),
        fetch("https://api.github.com/graphql", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(gqlQuery),
        }),
      ]);
      if (!repoResp.ok) throw new Error(`GitHub error for ${full}`);

      const repoData = await repoResp.json();
      const openPRsCount = (await openPRsResp.json()).length;
      const gqlData = await gqlResp.json();
      const closedIssuesCount = gqlData.data.repository.issues.totalCount;
      const mergedPRsCount = gqlData.data.repository.pullRequests.totalCount;

      rows.push({
        name: full,
        html_url: repoData.html_url,
        open_issues: repoData.open_issues_count - openPRsCount,
        open_prs: openPRsCount,
        merged_prs: mergedPRsCount,
        closed_issues: closedIssuesCount,
        pushed_at: repoData.pushed_at,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
      });
    }
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
