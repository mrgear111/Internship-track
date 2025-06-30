// ----- configuration -----
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
// -------------------------

const tokenInput = document.getElementById("tokenInput");
const loadBtn = document.getElementById("loadBtn");
const table = document.getElementById("statsTable");
const tbody = table.querySelector("tbody");

loadBtn.addEventListener("click", () => {
    const token = tokenInput.value.trim();
    if (!token) {
        alert("Please paste your GitHub token.");
        return;
    }
    table.style.display = "";
    tbody.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";

    fetchStats(token).catch(err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan='7' style='color:red;'>Error: ${err.message}</td></tr>`;
    });
});

async function fetchStats(token) {
    const headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`
    };

    const now = Date.now();
    

    const rows = [];
    for (const repo of REPOS) {
        const full = `${ORG}/${repo}`;
        // Parallel fetch: repo metadata + issues + PRs search
        const repoUrl = `https://api.github.com/repos/${full}`;
        const prsOpenUrl = `https://api.github.com/repos/${full}/pulls?state=open&per_page=1`;

        // GraphQL query to get total merged PRs and closed issues
        const gqlQuery = {
            query: `query($owner:String!, $name:String!){
              repository(owner:$owner, name:$name){
                pullRequests(states:MERGED){ totalCount }
                issues(states:CLOSED){ totalCount }
              }
            }`,
            variables: { owner: ORG, name: repo }
        };

        const [repoResp, openPRsResp, gqlResp] = await Promise.all([
            fetch(repoUrl, { headers }),
            fetch(prsOpenUrl, { headers }),
            fetch("https://api.github.com/graphql", {
                method: "POST",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(gqlQuery)
            })
        ]);

        if (!repoResp.ok) throw new Error(`API error for ${full}`);

        const repoData = await repoResp.json();
        const openPRsCount = (await openPRsResp.json()).length;
        const gqlData = await gqlResp.json();
        const closedIssuesCount = gqlData.data.repository.issues.totalCount;
        const mergedPRsCount = gqlData.data.repository.pullRequests.totalCount;

        rows.push({
            name: full,
            html_url: repoData.html_url,
            open_issues: repoData.open_issues_count - openPRsCount, // GitHub counts PRs as issues
            open_prs: openPRsCount,
            merged_prs: mergedPRsCount,
            closed_issues: closedIssuesCount,
            pushed_at: repoData.pushed_at
        });
    }

    renderTable(rows);
}

function renderTable(data) {
    tbody.innerHTML = "";
    const weekMs = 14 * 24 * 60 * 60 * 1000;
    data.forEach(r => {
        const lastPushDate = new Date(r.pushed_at);
        const active = (Date.now() - lastPushDate.getTime()) < weekMs ? "✅" : "❌";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><a href="${r.html_url}" target="_blank">${r.name}</a></td>
            <td>${r.open_issues}</td>
            <td>${r.open_prs}</td>
            <td>${r.merged_prs}</td>
            <td>${r.closed_issues}</td>
            <td>${r.pushed_at.slice(0,10)}</td>
            <td>${active}</td>
        `;
        tbody.appendChild(tr);
    });
}
