import pytest
from app.services.scoring_service import scoring_service, OBJECTIVE_CONFIG
from app.services.gemini_service import gemini_service
from app.services.github_service import github_service
from app.models.schemas import (
    FullRepoAnalysis, RepoMetadata, TechnologyAnalysis,
    LanguageStat, DetectedTech, FileItem, ParsedFileInfo,
    DependencyGraph, SetupGuide, VivaQuestion,
    CompareRequest, RepoComparisonResponse
)

def create_mock_analysis(
    name: str = "repo1",
    stars: int = 100,
    has_readme: bool = True,
    has_tests: bool = True,
    primary_lang: str = "Python"
) -> FullRepoAnalysis:
    files = [
        FileItem(path="main.py", name="main.py", type="blob", size=1000, category="source", language=primary_lang, extension=".py"),
        FileItem(path="utils.py", name="utils.py", type="blob", size=800, category="source", language=primary_lang, extension=".py"),
    ]
    if has_readme:
        files.append(FileItem(path="README.md", name="README.md", type="blob", size=1500, category="doc", extension=".md"))
    if has_tests:
        files.append(FileItem(path="tests/test_main.py", name="test_main.py", type="blob", size=900, category="test", language=primary_lang, extension=".py"))

    meta = RepoMetadata(
        owner="testuser",
        name=name,
        full_name=f"testuser/{name}",
        description=f"A sample {primary_lang} project for unit testing.",
        default_branch="main",
        stars=stars,
        forks=int(stars * 0.2),
        open_issues=2,
        license="MIT",
        updated_at="2026-10-01T12:00:00Z",
        created_at="2025-01-01T12:00:00Z",
        size_kb=250,
        html_url=f"https://github.com/testuser/{name}",
        has_readme=has_readme,
        readme_content="# Project\nDetailed instructions for setup and running the application." if has_readme else None
    )

    tech = TechnologyAnalysis(
        primary_language=primary_lang,
        languages=[LanguageStat(name=primary_lang, file_count=len(files), total_bytes=5000, percentage=100.0)],
        technologies=[
            DetectedTech(name="FastAPI" if primary_lang == "Python" else "Express", category="Backend", version="0.110.0", source_file="requirements.txt")
        ],
        category_counts={"source": 2, "test": 1 if has_tests else 0},
        total_files=len(files),
        total_directories=2,
        total_bytes=5000
    )

    return FullRepoAnalysis(
        metadata=meta,
        files=files,
        technology=tech,
        parsed_code=[
            ParsedFileInfo(path="main.py", language=primary_lang, classes=[], functions=[], imports=[], exports=[], is_entry_point=True, loc=40)
        ],
        dependency_graph=DependencyGraph(nodes=[], edges=[]),
        setup_guide=SetupGuide(prerequisites=["Python 3.10+"], install_steps=[], run_steps=[]),
        viva_questions=[
            VivaQuestion(id=1, category="Architecture", difficulty="Basic", question="Explain the entry point", answer_hint="main.py starts the server", relevant_files=["main.py"])
        ]
    )

def test_objective_weights_normalized():
    """Verify that every objective has normalized weights summing exactly to 1.0 (100%)."""
    for obj_name, obj_data in OBJECTIVE_CONFIG.items():
        weights = obj_data["weights"]
        total_weight = sum(weights.values())
        assert abs(total_weight - 1.0) < 0.001, f"Objective '{obj_name}' weights sum to {total_weight}, expected 1.0"

def test_scoring_measured_metrics():
    """Verify that objective metrics are properly calculated from analysis."""
    analysis = create_mock_analysis(name="metrics-test", stars=250, has_readme=True, has_tests=True)
    metrics = scoring_service.extract_measured_metrics(analysis)

    assert metrics.stars == 250
    assert metrics.test_files_count == 1
    assert metrics.doc_files_count == 1
    assert metrics.license_name == "MIT"
    assert metrics.primary_language == "Python"

def test_scoring_missing_info_graceful_handling():
    """Verify that missing tests or documentation does not result in an automatic 0 crash."""
    analysis = create_mock_analysis(name="bare-repo", stars=0, has_readme=False, has_tests=False)
    metrics = scoring_service.extract_measured_metrics(analysis)
    breakdown, score = scoring_service.compute_category_scores(
        analysis, metrics, OBJECTIVE_CONFIG["best_overall"]["weights"]
    )

    assert breakdown.testing.score > 0
    assert breakdown.documentation.score > 0
    assert score > 20.0  # Heuristic baseline protection active

def test_evaluate_and_rank_repositories():
    """Verify ranking and winner assignment for 2 repositories."""
    repo1_analysis = create_mock_analysis(name="small-repo", stars=10, has_readme=False, has_tests=False)
    repo2_analysis = create_mock_analysis(name="featured-repo", stars=500, has_readme=True, has_tests=True)

    ranked = scoring_service.evaluate_and_rank_repositories([
        ("https://github.com/testuser/small-repo", repo1_analysis),
        ("https://github.com/testuser/featured-repo", repo2_analysis)
    ], objective="best_overall")

    assert len(ranked) == 2
    assert ranked[0].rank == 1
    assert ranked[0].is_winner is True
    assert ranked[1].rank == 2
    assert ranked[1].is_winner is False
    assert ranked[0].full_name == "testuser/featured-repo"

def test_objective_reweighting_impact():
    """Verify that changing objectives shifts the weighted score."""
    analysis = create_mock_analysis(name="academic-repo", stars=50, has_readme=True, has_tests=False)
    ranked_mca = scoring_service.evaluate_and_rank_repositories([
        ("https://github.com/testuser/academic-repo", analysis)
    ], objective="mca_mini_project")

    ranked_prod = scoring_service.evaluate_and_rank_repositories([
        ("https://github.com/testuser/academic-repo", analysis)
    ], objective="production")

    # Production weights testing 20% (repo has 0 test files), whereas MCA weights architecture & doc
    assert ranked_mca[0].weighted_score != ranked_prod[0].weighted_score

def test_fallback_ai_comparison():
    """Verify rule-based comparative synthesis when Gemini API key is absent."""
    repo1 = create_mock_analysis(name="repo-alpha", stars=100)
    repo2 = create_mock_analysis(name="repo-beta", stars=200)

    ranked = scoring_service.evaluate_and_rank_repositories([
        ("https://github.com/testuser/repo-alpha", repo1),
        ("https://github.com/testuser/repo-beta", repo2)
    ], objective="best_overall")

    comp = gemini_service._generate_fallback_comparison(ranked, "best_overall", "Best Overall Project")

    assert comp.best_overall.winner_repo in ["testuser/repo-alpha", "testuser/repo-beta"]
    assert len(comp.strengths) == 2
    assert len(comp.weaknesses) == 2
    assert len(comp.key_differences) >= 2
    assert comp.final_verdict != ""

def test_comparison_exports():
    """Verify Markdown and HTML export generation."""
    from app.routers.compare import generate_comparison_markdown, generate_comparison_html

    repo1 = create_mock_analysis(name="repo-one", stars=120)
    repo2 = create_mock_analysis(name="repo-two", stars=340)

    ranked = scoring_service.evaluate_and_rank_repositories([
        ("https://github.com/testuser/repo-one", repo1),
        ("https://github.com/testuser/repo-two", repo2)
    ], objective="best_overall")

    ai_comp = gemini_service._generate_fallback_comparison(ranked, "best_overall", "Best Overall Project")

    comp_resp = RepoComparisonResponse(
        repositories=ranked,
        objective="best_overall",
        objective_label="Best Overall Project",
        comparison_date="2026-11-10 12:00 UTC",
        ai_recommendation=ai_comp,
        winner_repo_name=ranked[0].full_name,
        winner_summary="Test winner summary"
    )

    # Test Markdown Export
    md = generate_comparison_markdown(comp_resp)
    assert "# Multi-Repository Comparison & Evaluation Report" in md
    assert "repo-one" in md
    assert "repo-two" in md
    assert "Weighted Score" in md

    # Test HTML Export
    html = generate_comparison_html(comp_resp)
    assert "<!DOCTYPE html>" in html
    assert "Multi-Repository Comparison Report" in html
    assert "window.print()" in html

def test_compare_endpoint_validation():
    """Verify URL validation, duplicate prevention, and bounds enforcement."""
    from fastapi import HTTPException
    from app.routers.compare import validate_and_normalize_repos

    # Test less than 2 repositories
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_repos(["https://github.com/facebook/react"])
    assert exc_info.value.status_code == 400
    assert "At least 2" in exc_info.value.detail

    # Test more than 3 repositories
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_repos([
            "facebook/react", "tiangolo/fastapi", "vuejs/core", "angular/angular"
        ])
    assert exc_info.value.status_code == 400
    assert "maximum of 3" in exc_info.value.detail

    # Test duplicate repositories
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_repos([
            "https://github.com/facebook/react",
            "facebook/react"
        ])
    assert exc_info.value.status_code == 400
    assert "Duplicate repository detected" in exc_info.value.detail

    # Test valid 2 repositories
    valid2 = validate_and_normalize_repos(["facebook/react", "vuejs/vue"])
    assert len(valid2) == 2
    assert valid2[0][1] == "facebook" and valid2[0][2] == "react"
    assert valid2[1][1] == "vuejs" and valid2[1][2] == "vue"

    # Test valid 3 repositories
    valid3 = validate_and_normalize_repos(["facebook/react", "vuejs/vue", "angular/angular"])
    assert len(valid3) == 3


