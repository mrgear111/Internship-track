// detail modal handlers
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("detailModal");
    const closeBtn = document.getElementById("closeModal");
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });
});

function showDetails(repoStats) {
    const modal = document.getElementById("detailModal");
    const title = document.getElementById("detailTitle");
    const tbodyD = document.getElementById("detailTable").querySelector("tbody");
    title.textContent = repoStats.name;
    tbodyD.innerHTML = `
        <tr><td>Total Stars</td><td>${repoStats.stars}</td></tr>
        <tr><td>Total Forks</td><td>${repoStats.forks}</td></tr>
        <tr><td>Total Issues</td><td>${repoStats.open_issues + repoStats.closed_issues}</td></tr>
        <tr><td>Open Issues</td><td>${repoStats.open_issues}</td></tr>
        <tr><td>Closed Issues</td><td>${repoStats.closed_issues}</td></tr>
        <tr><td>Total PRs</td><td>${repoStats.open_prs + repoStats.merged_prs}</td></tr>
        <tr><td>Open PRs</td><td>${repoStats.open_prs}</td></tr>
        <tr><td>Merged PRs</td><td>${repoStats.merged_prs}</td></tr>
        <tr><td>Last Push</td><td>${repoStats.pushed_at.slice(0,10)}</td></tr>
    `;
    modal.style.display = "flex";
}
