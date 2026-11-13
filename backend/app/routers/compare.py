import asyncio
from datetime import datetime, timezone
from typing import List, Tuple
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse, HTMLResponse
from app.models.schemas import (
    CompareRequest, RepoComparisonResponse, FullRepoAnalysis
)
from app.services.github_service import github_service
from app.services.scoring_service import scoring_service, OBJECTIVE_CONFIG
from app.services.gemini_service import gemini_service
from app.routers.analyze import analyze_single_repo

router = APIRouter(prefix="/compare", tags=["Repository Comparison"])

def validate_and_normalize_repos(raw_repositories: List[str]) -> List[Tuple[str, str, str]]:
    """
    Validates repository URL list:
    1. Ensures between 2 and 3 repository URLs are provided.
    2. Parses owner and repo using github_service.
    3. Checks for duplicates case-insensitively.
    Returns list of (url, owner, repo) tuples.
    """
    cleaned_urls = [u.strip() for u in raw_repositories if u and u.strip()]

    if len(cleaned_urls) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 GitHub repositories are required for comparison."
        )
    if len(cleaned_urls) > 3:
        raise HTTPException(
            status_code=400,
            detail="A maximum of 3 GitHub repositories can be compared at one time."
        )

    parsed_repos: List[Tuple[str, str, str]] = []
    seen = set()
    for url in cleaned_urls:
        try:
            owner, repo = github_service.parse_repo_url(url)
            full_key = f"{owner.lower()}/{repo.lower()}"
            if full_key in seen:
                raise HTTPException(
                    status_code=400,
                    detail=f"Duplicate repository detected: '{owner}/{repo}'. Please provide 2 or 3 distinct repositories."
                )
            seen.add(full_key)
            parsed_repos.append((url, owner, repo))
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid GitHub repository URL '{url}': {str(e)}"
            )

    return parsed_repos

@router.post("", response_model=RepoComparisonResponse)
async def compare_repositories(request: CompareRequest):
    """
    Simultaneously compares 2 or 3 GitHub repositories:
    1. Validates repository URLs and ensures 2-3 unique repos are provided.
    2. Runs complete static and AST analysis pipelines independently in parallel.
    3. Extracts objective measurements (LOC, files, tests, classes, docstring coverage, etc.).
    4. Computes transparent 8-category scores normalized on a 100-point scale.
    5. Adjusts category weights dynamically based on user's comparison objective.
    6. Generates AI-grounded comparative insights, category winners, and trade-off rationales.
    7. Returns comprehensive structured comparison results.
    """
    parsed_repos = validate_and_normalize_repos(request.repositories)

    # Execute repository analysis pipelines in parallel
    async def analyze_with_context(url: str) -> Tuple[str, FullRepoAnalysis]:
        analysis = await analyze_single_repo(
            url=url,
            github_token=request.github_token,
            gemini_api_key=request.gemini_api_key
        )
        return (url, analysis)

    tasks = [analyze_with_context(url) for url, _, _ in parsed_repos]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Check for individual repository failures
    successful_analyses: List[Tuple[str, FullRepoAnalysis]] = []
    for idx, res in enumerate(results):
        url, owner, repo = parsed_repos[idx]
        if isinstance(res, Exception):
            err_msg = str(res)
            if hasattr(res, "detail"):
                err_msg = res.detail
            raise HTTPException(
                status_code=400,
                detail=f"Failed to analyze repository '{owner}/{repo}': {err_msg}"
            )
        successful_analyses.append(res)

    # Validate objective
    obj_key = request.objective if request.objective in OBJECTIVE_CONFIG else "best_overall"
    obj_info = OBJECTIVE_CONFIG[obj_key]

    # Calculate objective metrics, scores, and rankings
    ranked_items = scoring_service.evaluate_and_rank_repositories(
        analyses=successful_analyses,
        objective=obj_key
    )

    # Run AI Comparative synthesis via Gemini (with static fallback)
    ai_recommendation = await gemini_service.compare_repositories(
        repositories=ranked_items,
        objective=obj_key,
        objective_label=obj_info["label"],
        custom_key=request.gemini_api_key
    )

    winner_repo = ranked_items[0]
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    return RepoComparisonResponse(
        repositories=ranked_items,
        objective=obj_key,
        objective_label=obj_info["label"],
        comparison_date=now_str,
        ai_recommendation=ai_recommendation,
        winner_repo_name=winner_repo.full_name,
        winner_summary=ai_recommendation.final_verdict or f"Ranked #1 with highest weighted score of {winner_repo.weighted_score}/100."
    )

def generate_comparison_markdown(comparison: RepoComparisonResponse) -> str:
    """Generates an extensive Markdown comparison report."""
    repos = comparison.repositories
    ai = comparison.ai_recommendation

    # Header section
    repo_header_cols = " | ".join([f"**{r.full_name}**" for r in repos])
    header_sep = " | ".join(["---" for _ in repos])

    # Table 1: High Level Metrics
    rows = [
        ("Rank & Verdict", " | ".join([f"**#{r.rank}** {'🏆 Winner' if r.is_winner else ''}" for r in repos])),
        ("Weighted Score", " | ".join([f"**{r.weighted_score} / 100**" for r in repos])),
        ("Base Score (Unweighted)", " | ".join([f"{r.base_score} / 100" for r in repos])),
        ("Primary Language", " | ".join([r.technology.primary_language for r in repos])),
        ("GitHub Stars", " | ".join([str(r.measured_metrics.stars) for r in repos])),
        ("GitHub Forks", " | ".join([str(r.measured_metrics.forks) for r in repos])),
        ("Open Issues", " | ".join([str(r.measured_metrics.open_issues) for r in repos])),
        ("Repository Size", " | ".join([f"{r.measured_metrics.size_kb} KB" for r in repos])),
        ("Total Files", " | ".join([str(r.measured_metrics.total_files) for r in repos])),
        ("Test Files", " | ".join([str(r.measured_metrics.test_files_count) for r in repos])),
        ("Parsed Classes", " | ".join([str(r.measured_metrics.total_classes) for r in repos])),
        ("Parsed Functions", " | ".join([str(r.measured_metrics.total_functions) for r in repos])),
        ("Docstring Coverage", " | ".join([f"{r.measured_metrics.docstring_coverage_pct}%" for r in repos])),
        ("License", " | ".join([r.metadata.license or "None" for r in repos])),
    ]

    table_md = f"| Metric | {repo_header_cols} |\n|---|{header_sep}|\n"
    for label, val_cols in rows:
        table_md += f"| {label} | {val_cols} |\n"

    # Category Scores Table
    cat_keys = [
        ("Code Quality (20%)", "code_quality"),
        ("Architecture & Structure (15%)", "architecture"),
        ("Documentation (10%)", "documentation"),
        ("Testing & Verification (10%)", "testing"),
        ("Maintainability (15%)", "maintainability"),
        ("Technology Stack (10%)", "technology"),
        ("Activity & Maintenance (10%)", "activity"),
        ("Security Indicators (10%)", "security"),
    ]

    score_table_md = f"| Evaluation Category | {repo_header_cols} |\n|---|{header_sep}|\n"
    for label, key in cat_keys:
        cols = " | ".join([f"{getattr(r.scores, key).score} / 100" for r in repos])
        score_table_md += f"| {label} | {cols} |\n"

    # Strengths and Weaknesses
    sw_sections = []
    for r in repos:
        r_str = "\n".join([f"  - ✅ {s}" for s in ai.strengths.get(r.full_name, [])]) or "  - Standard implementation"
        r_weak = "\n".join([f"  - ⚠️ {w}" for w in ai.weaknesses.get(r.full_name, [])]) or "  - None noted"
        sw_sections.append(f"### {r.full_name} (Rank #{r.rank})\n**Strengths:**\n{r_str}\n\n**Areas for Improvement:**\n{r_weak}\n")

    diffs_md = "\n".join([f"- {d}" for d in ai.key_differences])

    recommendation_categories = [
        ai.best_overall,
        ai.best_for_beginners,
        ai.best_for_academic,
        ai.best_for_advanced,
        ai.best_for_learning,
        ai.best_architecture,
        ai.best_maintainability,
    ]
    recs_md = "\n".join([
        f"- **{rc.title}:** `{rc.winner_repo}`\n  > {rc.reasoning}"
        for rc in recommendation_categories
    ])

    report = f"""# Multi-Repository Comparison & Evaluation Report

**Generated by GitHub Project Analyzer**  
**Comparison Date:** {comparison.comparison_date}  
**Selected Objective:** {comparison.objective_label}  
**Repositories Evaluated:** {", ".join([f"[{r.full_name}]({r.repo_url})" for r in repos])}  

---

## 1. Executive Summary & Verdict

🏆 **Winner:** **{comparison.winner_repo_name}**

{comparison.winner_summary}

### Comparison Overview
{ai.summary}

---

## 2. Objective Measurements & Metric Comparison

{table_md}

---

## 3. Intelligent Weighted Category Scores (0-100)

*Scores evaluated using transparent heuristic indicators normalized across repositories.*

{score_table_md}

---

## 4. AI Category Recommendations & Trade-Offs

{recs_md}

---

## 5. Strengths and Weaknesses Breakdown

{"".join(sw_sections)}

---

## 6. Key Architectural & Implementation Differences

{diffs_md}

---

## 7. Final Recommendation & Implementation Guidance

{ai.final_verdict}

---
*Report generated automatically using GitHub Project Analyzer Static Analysis Engine & Google Gemini.*
"""
    return report.strip()

@router.post("/export/markdown", response_class=PlainTextResponse)
def export_comparison_markdown(comparison: RepoComparisonResponse):
    return generate_comparison_markdown(comparison)

def generate_comparison_html(comparison: RepoComparisonResponse) -> str:
    """Generates an elegant printable HTML comparison report."""
    repos = comparison.repositories
    ai = comparison.ai_recommendation

    th_cols = "".join([f"<th>{r.full_name} (Rank #{r.rank})</th>" for r in repos])

    def render_row(label: str, values: List[str]) -> str:
        tds = "".join([f"<td>{v}</td>" for v in values])
        return f"<tr><td><strong>{label}</strong></td>{tds}</tr>"

    metric_rows = [
        render_row("Rank & Verdict", [f"<span class='badge {'winner' if r.is_winner else ''}'>Rank #{r.rank}</span>" for r in repos]),
        render_row("Weighted Score", [f"<strong>{r.weighted_score} / 100</strong>" for r in repos]),
        render_row("Base Score", [f"{r.base_score} / 100" for r in repos]),
        render_row("Primary Language", [f"<code>{r.technology.primary_language}</code>" for r in repos]),
        render_row("GitHub Stars", [str(r.measured_metrics.stars) for r in repos]),
        render_row("GitHub Forks", [str(r.measured_metrics.forks) for r in repos]),
        render_row("Open Issues", [str(r.measured_metrics.open_issues) for r in repos]),
        render_row("Repository Size", [f"{r.measured_metrics.size_kb} KB" for r in repos]),
        render_row("Total Files", [str(r.measured_metrics.total_files) for r in repos]),
        render_row("Test Files", [str(r.measured_metrics.test_files_count) for r in repos]),
        render_row("Parsed Classes", [str(r.measured_metrics.total_classes) for r in repos]),
        render_row("Parsed Functions", [str(r.measured_metrics.total_functions) for r in repos]),
        render_row("Docstring Coverage", [f"{r.measured_metrics.docstring_coverage_pct}%" for r in repos]),
        render_row("License", [r.metadata.license or "None" for r in repos]),
    ]

    cat_keys = [
        ("Code Quality (20%)", "code_quality"),
        ("Architecture & Structure (15%)", "architecture"),
        ("Documentation (10%)", "documentation"),
        ("Testing & Verification (10%)", "testing"),
        ("Maintainability (15%)", "maintainability"),
        ("Technology Stack (10%)", "technology"),
        ("Activity & Maintenance (10%)", "activity"),
        ("Security Indicators (10%)", "security"),
    ]

    score_rows = [
        render_row(label, [f"<strong>{getattr(r.scores, key).score}</strong> / 100" for r in repos])
        for label, key in cat_keys
    ]

    sw_cards = "".join([
        f"""<div class="sw-card">
            <h4>{r.full_name} {f"<span class='badge winner'>Winner</span>" if r.is_winner else f"<span class='badge'>#{r.rank}</span>"}</h4>
            <div class="sw-section">
                <strong>Strengths:</strong>
                <ul>{"".join([f"<li>✅ {s}</li>" for s in ai.strengths.get(r.full_name, [])])}</ul>
            </div>
            <div class="sw-section">
                <strong>Areas for Improvement:</strong>
                <ul>{"".join([f"<li>⚠️ {w}</li>" for w in ai.weaknesses.get(r.full_name, [])])}</ul>
            </div>
        </div>"""
        for r in repos
    ])

    recs_cards = "".join([
        f"""<div class="rec-card">
            <span class="badge winner">{rc.title}</span>
            <h4>🏆 {rc.winner_repo}</h4>
            <p>{rc.reasoning}</p>
        </div>"""
        for rc in [
            ai.best_overall, ai.best_for_beginners, ai.best_for_academic,
            ai.best_for_advanced, ai.best_for_learning, ai.best_architecture, ai.best_maintainability
        ]
    ])

    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Multi-Repository Comparison Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 1000px; margin: 40px auto; padding: 0 24px; }}
        h1, h2, h3, h4 {{ color: #0f172a; margin-top: 1.4em; }}
        h1 {{ border-bottom: 2px solid #6366f1; padding-bottom: 8px; }}
        .header-meta {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }}
        .badge {{ display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #e2e8f0; color: #334155; }}
        .badge.winner {{ background: #dcfce7; color: #15803d; border: 1px solid #86efac; }}
        table {{ width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 14px; }}
        th, td {{ border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }}
        th {{ background: #f1f5f9; }}
        code {{ background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; }}
        .sw-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin: 20px 0; }}
        .sw-card {{ background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }}
        .sw-section {{ margin-top: 10px; font-size: 13px; }}
        .sw-section ul {{ padding-left: 18px; margin: 6px 0; }}
        .rec-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin: 16px 0; }}
        .rec-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 13px; }}
        .rec-card h4 {{ margin: 8px 0 4px 0; }}
        @media print {{
            body {{ max-width: 100%; margin: 0; padding: 12px; }}
            .no-print {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="no-print" style="margin-bottom: 24px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 22px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(99,102,241,0.3);">
            🖨️ Print / Save as PDF
        </button>
    </div>

    <h1>Multi-Repository Comparison & Evaluation Report</h1>
    
    <div class="header-meta">
        <p><strong>Evaluation Date:</strong> {comparison.comparison_date}</p>
        <p><strong>Comparison Objective:</strong> <span class="badge">{comparison.objective_label}</span></p>
        <p><strong>Overall Recommended Winner:</strong> <span class="badge winner">🏆 {comparison.winner_repo_name}</span></p>
        <p><strong>Verdict Summary:</strong> {comparison.winner_summary}</p>
    </div>

    <h3>Executive Summary</h3>
    <p>{ai.summary}</p>

    <h3>Objective Metric Comparison</h3>
    <table>
        <thead>
            <tr><th>Metric</th>{th_cols}</tr>
        </thead>
        <tbody>
            {"".join(metric_rows)}
        </tbody>
    </table>

    <h3>Intelligent Weighted Category Scores</h3>
    <table>
        <thead>
            <tr><th>Category</th>{th_cols}</tr>
        </thead>
        <tbody>
            {"".join(score_rows)}
        </tbody>
    </table>

    <h3>Category-Specific Recommendations</h3>
    <div class="rec-grid">
        {recs_cards}
    </div>

    <h3>Strengths & Areas for Improvement</h3>
    <div class="sw-grid">
        {sw_cards}
    </div>

    <h3>Final Recommendation</h3>
    <p>{ai.final_verdict}</p>

    <footer style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        Generated by GitHub Project Analyzer • Built with FastAPI, React, and Google Gemini AI
    </footer>
</body>
</html>"""
    return html_content

@router.post("/export/html", response_class=HTMLResponse)
def export_comparison_html(comparison: RepoComparisonResponse):
    return generate_comparison_html(comparison)

