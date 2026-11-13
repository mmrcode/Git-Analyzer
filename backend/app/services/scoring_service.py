import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple
from app.models.schemas import (
    FullRepoAnalysis, MeasuredMetrics, ScoreBreakdown,
    CategoryScore, RepoComparisonItem
)

# Objective Display Labels and Weights Definition
OBJECTIVE_CONFIG: Dict[str, Dict[str, Any]] = {
    "best_overall": {
        "label": "Best Overall Project",
        "description": "Balanced evaluation across code quality, architecture, maintainability, testing, and modern standards.",
        "weights": {
            "code_quality": 0.20,
            "architecture": 0.15,
            "documentation": 0.10,
            "testing": 0.10,
            "maintainability": 0.15,
            "technology": 0.10,
            "activity": 0.10,
            "security": 0.10,
        }
    },
    "beginners": {
        "label": "Best for Beginners",
        "description": "Prioritizes thorough documentation, clean code readability, and simplicity of setup.",
        "weights": {
            "documentation": 0.25,
            "maintainability": 0.20,
            "architecture": 0.15,
            "code_quality": 0.15,
            "technology": 0.10,
            "activity": 0.05,
            "testing": 0.05,
            "security": 0.05,
        }
    },
    "mca_mini_project": {
        "label": "Best for MCA Mini Project",
        "description": "Focuses on academic viva defense, clear layered architecture, documentation, and tech relevance.",
        "weights": {
            "architecture": 0.25,
            "documentation": 0.20,
            "code_quality": 0.15,
            "technology": 0.15,
            "maintainability": 0.10,
            "activity": 0.05,
            "testing": 0.05,
            "security": 0.05,
        }
    },
    "final_year_project": {
        "label": "Best for Final Year Project",
        "description": "Demands architectural rigor, testing coverage, comprehensive scope, and code excellence.",
        "weights": {
            "architecture": 0.20,
            "code_quality": 0.20,
            "technology": 0.15,
            "testing": 0.15,
            "documentation": 0.15,
            "maintainability": 0.05,
            "security": 0.05,
            "activity": 0.05,
        }
    },
    "portfolio": {
        "label": "Best for Portfolio",
        "description": "Highlights modern, eye-catching technologies, active maintenance, and presentation quality.",
        "weights": {
            "technology": 0.20,
            "architecture": 0.20,
            "documentation": 0.15,
            "code_quality": 0.15,
            "activity": 0.15,
            "maintainability": 0.10,
            "testing": 0.05,
            "security": 0.00,
        }
    },
    "learning": {
        "label": "Best for Learning",
        "description": "Emphasizes clear explanations, modular code structure, and exemplary architectural patterns.",
        "weights": {
            "documentation": 0.25,
            "architecture": 0.20,
            "code_quality": 0.15,
            "maintainability": 0.15,
            "technology": 0.15,
            "testing": 0.05,
            "activity": 0.05,
            "security": 0.00,
        }
    },
    "production": {
        "label": "Best for Production Use",
        "description": "Strictly weights automated test coverage, security hygiene, maintainability, and code stability.",
        "weights": {
            "testing": 0.20,
            "code_quality": 0.20,
            "security": 0.15,
            "maintainability": 0.15,
            "architecture": 0.15,
            "activity": 0.10,
            "technology": 0.05,
            "documentation": 0.00,
        }
    }
}

class ScoringService:
    def extract_measured_metrics(self, analysis: FullRepoAnalysis) -> MeasuredMetrics:
        """Extracts strictly objective quantitative measurements from analysis data."""
        meta = analysis.metadata
        tech = analysis.technology
        files = analysis.files
        parsed = analysis.parsed_code

        source_count = sum(1 for f in files if f.category == "source")
        test_count = sum(1 for f in files if f.category == "test")
        doc_count = sum(1 for f in files if f.category == "doc")

        total_classes = sum(len(pf.classes) for pf in parsed)
        total_functions = sum(len(pf.functions) for pf in parsed)

        # Docstring coverage calculation
        docstring_count = 0
        for pf in parsed:
            for cls in pf.classes:
                if cls.docstring:
                    docstring_count += 1
                for m in cls.methods:
                    if m.docstring:
                        docstring_count += 1
            for f in pf.functions:
                if f.docstring:
                    docstring_count += 1

        total_items = max(1, total_classes + total_functions)
        docstring_pct = round((docstring_count / total_items) * 100, 1)

        return MeasuredMetrics(
            stars=meta.stars,
            forks=meta.forks,
            open_issues=meta.open_issues,
            size_kb=meta.size_kb,
            total_files=tech.total_files,
            total_directories=tech.total_directories,
            source_files_count=source_count,
            test_files_count=test_count,
            doc_files_count=doc_count,
            parsed_modules_count=len(parsed),
            total_classes=total_classes,
            total_functions=total_functions,
            docstring_coverage_pct=docstring_pct,
            license_name=meta.license,
            last_updated=meta.updated_at,
            created_at=meta.created_at,
            primary_language=tech.primary_language,
            technologies_count=len(tech.technologies)
        )

    def compute_category_scores(
        self,
        analysis: FullRepoAnalysis,
        metrics: MeasuredMetrics,
        weights: Dict[str, float]
    ) -> Tuple[ScoreBreakdown, float]:
        """
        Calculates heuristic scores (0-100) for each of the 8 evaluation categories.
        Applies normalized weights to derive overall weighted score.
        """
        # 1. Code Quality (Target: modular functions/classes, docstrings, LOC health)
        cq_score = 40.0  # safe baseline
        if metrics.total_classes > 0 or metrics.total_functions > 5:
            cq_score += 25.0
        if metrics.docstring_coverage_pct > 25.0:
            cq_score += 15.0
        elif metrics.docstring_coverage_pct > 5.0:
            cq_score += 8.0
        # Check average LOC of parsed modules
        if analysis.parsed_code:
            avg_loc = sum(pf.loc for pf in analysis.parsed_code) / len(analysis.parsed_code)
            if 15 <= avg_loc <= 350:
                cq_score += 15.0
            elif avg_loc < 600:
                cq_score += 8.0
        if any(f.is_async for pf in analysis.parsed_code for f in pf.functions):
            cq_score += 5.0
        cq_score = min(98.0, max(30.0, cq_score))
        cq_rationale = (
            f"Measured {metrics.total_functions} functions & {metrics.total_classes} classes across {metrics.parsed_modules_count} parsed source files. "
            f"In-code documentation coverage is approximately {metrics.docstring_coverage_pct}%."
        )

        # 2. Architecture & Structure (Target: directory modularity, entry points, graph)
        arch_score = 40.0
        if metrics.total_directories >= 3:
            arch_score += 20.0
        elif metrics.total_directories >= 1:
            arch_score += 10.0
        if any(pf.is_entry_point for pf in analysis.parsed_code):
            arch_score += 20.0
        graph_nodes = len(analysis.dependency_graph.nodes)
        graph_edges = len(analysis.dependency_graph.edges)
        if graph_nodes > 3 and graph_edges > 2:
            arch_score += 15.0
        node_categories = {n.category for n in analysis.dependency_graph.nodes}
        if len(node_categories) >= 3:
            arch_score += 10.0
        arch_score = min(98.0, max(35.0, arch_score))
        arch_rationale = (
            f"Identified {metrics.total_directories} directories with {graph_nodes} dependency nodes and {graph_edges} inter-module relationships. "
            f"Clear entry point detection: {'Yes' if any(pf.is_entry_point for pf in analysis.parsed_code) else 'Implicit'}."
        )

        # 3. Documentation (Target: README completeness, setup guide, viva questions)
        doc_score = 35.0
        if analysis.metadata.has_readme:
            doc_score += 25.0
            readme_len = len(analysis.metadata.readme_content or "")
            if readme_len > 1500:
                doc_score += 20.0
            elif readme_len > 400:
                doc_score += 10.0
        if analysis.metadata.description:
            doc_score += 10.0
        if len(analysis.setup_guide.install_steps) > 0:
            doc_score += 10.0
        doc_score = min(99.0, max(25.0, doc_score))
        doc_rationale = (
            f"README available: {'Yes' if analysis.metadata.has_readme else 'No'}. "
            f"Detailed setup guide includes {len(analysis.setup_guide.install_steps)} install and {len(analysis.setup_guide.run_steps)} run instructions."
        )

        # 4. Testing (Target: dedicated test files, test-to-source ratio, testing libraries)
        test_score = 30.0  # safe baseline to avoid zeroing out
        if metrics.test_files_count > 0:
            test_score += 35.0
            test_ratio = metrics.test_files_count / max(1, metrics.source_files_count)
            if test_ratio >= 0.2:
                test_score += 20.0
            else:
                test_score += 10.0
        # Check if test tech is detected
        test_techs = [t.name for t in analysis.technology.technologies if t.category.lower() == "testing"]
        if test_techs:
            test_score += 15.0
        test_score = min(98.0, max(25.0, test_score))
        test_rationale = (
            f"Detected {metrics.test_files_count} test files. "
            f"{'Recognized test tooling: ' + ', '.join(test_techs) if test_techs else 'No dedicated test harness declared in manifests.'}"
        )

        # 5. Maintainability (Target: modular file sizes, package manifest, dependency management)
        maint_score = 42.0
        if metrics.total_files > 0:
            avg_file_size = (metrics.size_kb * 1024) / max(1, metrics.total_files)
            if avg_file_size < 35000:  # reasonable file sizing
                maint_score += 20.0
        manifest_files = {t.source_file for t in analysis.technology.technologies}
        if manifest_files:
            maint_score += 20.0
        if metrics.total_directories > 0:
            maint_score += 15.0
        maint_score = min(98.0, max(35.0, maint_score))
        maint_rationale = (
            f"Codebase consists of {metrics.total_files} files across {metrics.total_directories} directories. "
            f"Dependencies declared via standard manifests: {', '.join(manifest_files) or 'None'}."
        )

        # 6. Technology & Implementation (Target: modern stacks, framework diversity)
        tech_score = 45.0
        if len(analysis.technology.technologies) >= 4:
            tech_score += 25.0
        elif len(analysis.technology.technologies) >= 1:
            tech_score += 15.0
        # Check stack diversity
        categories_detected = set(analysis.technology.category_counts.keys())
        if len(categories_detected) >= 3:
            tech_score += 20.0
        elif len(categories_detected) >= 1:
            tech_score += 10.0
        if analysis.technology.primary_language and analysis.technology.primary_language != "Unknown":
            tech_score += 10.0
        tech_score = min(98.0, max(35.0, tech_score))
        tech_rationale = (
            f"Primary Language: {analysis.technology.primary_language}. "
            f"Identified {len(analysis.technology.technologies)} external libraries/frameworks spanning {len(categories_detected)} architectural layers."
        )

        # 7. Project Activity & Maintenance (Target: recency, issue ratio, stars/forks log scale)
        act_score = 35.0
        if analysis.metadata.updated_at:
            try:
                # Parse date
                clean_date = analysis.metadata.updated_at.replace("Z", "+00:00")
                upd_date = datetime.fromisoformat(clean_date)
                now = datetime.now(timezone.utc)
                days_diff = (now - upd_date).days
                if days_diff <= 90:
                    act_score += 35.0
                elif days_diff <= 365:
                    act_score += 22.0
                elif days_diff <= 730:
                    act_score += 12.0
                else:
                    act_score += 5.0
            except Exception:
                act_score += 15.0
        # Popularity / engagement factor (log scale so not dominating quality)
        stars_pts = min(20.0, math.log10(max(1, metrics.stars) + 1) * 6.0)
        act_score += stars_pts
        act_score = min(98.0, max(25.0, act_score))
        act_rationale = (
            f"Last updated: {analysis.metadata.updated_at or 'Unknown'}. "
            f"Community engagement: {metrics.stars} stars, {metrics.forks} forks, and {metrics.open_issues} open issues."
        )

        # 8. Security Indicators (Target: open license, secret avoidance / .env usage)
        sec_score = 40.0
        if analysis.metadata.license:
            sec_score += 30.0
        else:
            sec_score += 10.0
        # Check if .env.example or .env.sample exists
        has_env_sample = any(".env" in f.name.lower() for f in analysis.files)
        if has_env_sample:
            sec_score += 20.0
        sec_score = min(98.0, max(30.0, sec_score))
        sec_rationale = (
            f"License: {analysis.metadata.license or 'None explicitly detected'}. "
            f"Environment configuration template present: {'Yes' if has_env_sample else 'No'}."
        )

        # Construct CategoryScore objects
        scores_map = {
            "code_quality": (cq_score, cq_rationale),
            "architecture": (arch_score, arch_rationale),
            "documentation": (doc_score, doc_rationale),
            "testing": (test_score, test_rationale),
            "maintainability": (maint_score, maint_rationale),
            "technology": (tech_score, tech_rationale),
            "activity": (act_score, act_rationale),
            "security": (sec_score, sec_rationale),
        }

        breakdown_dict = {}
        total_weighted = 0.0

        for cat, (raw_val, rat) in scores_map.items():
            w = weights.get(cat, 0.125)
            w_score = raw_val * w
            total_weighted += w_score
            breakdown_dict[cat] = CategoryScore(
                name=cat.replace("_", " ").title(),
                score=round(raw_val, 1),
                weight=round(w, 2),
                weighted_score=round(w_score, 1),
                rationale=rat,
                is_heuristic=True
            )

        breakdown = ScoreBreakdown(
            code_quality=breakdown_dict["code_quality"],
            architecture=breakdown_dict["architecture"],
            documentation=breakdown_dict["documentation"],
            testing=breakdown_dict["testing"],
            maintainability=breakdown_dict["maintainability"],
            technology=breakdown_dict["technology"],
            activity=breakdown_dict["activity"],
            security=breakdown_dict["security"],
        )

        return breakdown, round(total_weighted, 1)

    def evaluate_and_rank_repositories(
        self,
        analyses: List[Tuple[str, FullRepoAnalysis]],
        objective: str = "best_overall"
    ) -> List[RepoComparisonItem]:
        """
        Evaluates 2 or 3 analyzed repositories, calculates metrics & weighted scores,
        and assigns rankings.
        """
        obj_key = objective if objective in OBJECTIVE_CONFIG else "best_overall"
        obj_weights = OBJECTIVE_CONFIG[obj_key]["weights"]
        base_weights = OBJECTIVE_CONFIG["best_overall"]["weights"]

        items: List[RepoComparisonItem] = []

        for repo_url, analysis in analyses:
            metrics = self.extract_measured_metrics(analysis)
            # Compute base score
            _, base_score = self.compute_category_scores(analysis, metrics, base_weights)
            # Compute objective-weighted score
            scores_breakdown, weighted_score = self.compute_category_scores(analysis, metrics, obj_weights)

            item = RepoComparisonItem(
                repo_url=repo_url,
                full_name=analysis.metadata.full_name,
                metadata=analysis.metadata,
                technology=analysis.technology,
                measured_metrics=metrics,
                scores=scores_breakdown,
                base_score=base_score,
                weighted_score=weighted_score,
                rank=1,
                is_winner=False,
                analysis=analysis
            )
            items.append(item)

        # Sort by weighted_score descending
        items.sort(key=lambda x: (x.weighted_score, x.base_score), reverse=True)

        for idx, itm in enumerate(items):
            itm.rank = idx + 1
            itm.is_winner = (idx == 0)

        return items

scoring_service = ScoringService()

