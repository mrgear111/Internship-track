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
const PRESET_TOKEN = "YOUR_GH_PAT_HERE"; // <<< replace with real token
const AUTH_USER = "admin";
const AUTH_PASS = "track123";
const SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwG7obbGvRIwzSwMeZ290DFoPeAdcTY83XJebdztPB_nQb_BTAhCN7O3rMveIvkI4wG/exec";

const loginBox = document.getElementById("loginBox");
const controls = document.getElementById("controls");
const loginBtn = document.getElementById("loginBtn");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");

loginBtn.addEventListener("click", () => {
    if(loginUser.value === AUTH_USER && loginPass.value === AUTH_PASS){
        loginBox.style.display = "none";
        mainHeading.textContent += " (logged in)";
        controls.style.display = "";
        loadStats();
    } else {
        alert("Invalid credentials");
    }
});

const tokenInput = document.getElementById("tokenInput");
const loadBtn = document.getElementById("loadBtn");
const table = document.getElementById("statsTable");
const tbody = table.querySelector("tbody");

loadBtn.addEventListener("click", loadStats);

async function loadStats(){
    table.style.display = "";
    tbody.innerHTML = "<tr><td colspan='10'>Loading…</td></tr>";
    try{
        const resp = await fetch("/api/stats");
        if(!resp.ok){
            const text = await resp.text();
            throw new Error(text);
        }
        const rows = await resp.json();
        if(!Array.isArray(rows)){
            throw new Error(rows.error || "Unexpected response from server");
        }
        renderTable(rows);
        sendToSheets(rows);
    }catch(err){
        console.error(err);
        tbody.innerHTML = `<tr><td colspan='9' style='color:red;'>Error: ${err.message}</td></tr>`;
    }
}

// fetchStats kept for legacy (no longer used) 
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
            pushed_at: repoData.pushed_at,
            stars: repoData.stargazers_count,
            forks: repoData.forks_count
        });
    }

    renderTable(rows);
    sendToSheets(rows);
}

function sendToSheets(data) {
    fetch(SHEETS_WEBAPP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => console.log("Sheets response", r.status)).catch(console.error);
}

function renderTable(data) {
    // summary
    const totals = data.reduce((acc, r) => {
        acc.issues += r.open_issues + r.closed_issues;
        acc.closedIssues += r.closed_issues;
        acc.openIssues += r.open_issues;
        acc.prs += r.open_prs + r.merged_prs;
        acc.openPRs += r.open_prs;
        acc.mergedPRs += r.merged_prs;
        return acc;
    }, {issues:0, closedIssues:0, openIssues:0, prs:0, openPRs:0, mergedPRs:0});
    let summaryEl = document.getElementById("summary");
    if(!summaryEl){
        summaryEl = document.createElement("p");
        summaryEl.id = "summary";
        summaryEl.style.fontWeight = "bold";
        summaryEl.style.marginTop = "1rem";
        table.parentNode.insertBefore(summaryEl, table.nextSibling);
    }
    summaryEl.textContent = `Total Issues: ${totals.issues} (Open ${totals.openIssues}, Closed ${totals.closedIssues})  |  Total PRs: ${totals.prs} (Open ${totals.openPRs}, Merged ${totals.mergedPRs})`;

    // sort by stars descending
    data.sort((a,b)=>b.stars-a.stars);
    tbody.innerHTML = "";
    const weekMs = 14 * 24 * 60 * 60 * 1000;
    data.forEach(r => {
        const lastPushDate = new Date(r.pushed_at);
        const active = (Date.now() - lastPushDate.getTime()) < weekMs ? "✅" : "❌";
        const totalIssues = r.open_issues + r.closed_issues;
        const totalPRs = r.open_prs + r.merged_prs;
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><a href="${r.html_url}" target="_blank">${r.name}</a></td>
            <td>${totalIssues}</td>
            <td>${r.open_issues}</td>
            <td>${totalPRs}</td>
            <td>${r.open_prs}</td>
            <td>${r.merged_prs}</td>
            <td>${r.closed_issues}</td>
            <td>${r.pushed_at.slice(0,10)}</td>
            <td>${active}</td>
        `;
                tbody.appendChild(tr);
        tr.addEventListener("click", () => showDetails(r));
    });
}
