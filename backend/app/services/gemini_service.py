import json
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings
from app.models.schemas import (
    AIProjectSummary, AIFileExplanation, AIChatResponse,
    TechnologyAnalysis, RepoMetadata, ParsedFileInfo,
    AIComparisonRecommendation, RecommendationCategory, RepoComparisonItem
)

class GeminiService:
    def __init__(self):
        self.default_model = "gemini-2.0-flash"
        self.fallback_model = "gemini-1.5-flash"

    def _get_api_key(self, custom_key: Optional[str] = None) -> str:
        key = (custom_key or settings.GEMINI_API_KEY or "").strip()
        return key

    async def _call_gemini_api(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        custom_key: Optional[str] = None,
        temperature: float = 0.4
    ) -> str:
        """
        Executes a call to the Google Gemini Generative Language REST API.
        Works seamlessly with free Google AI Studio Gemini API keys.
        """
        api_key = self._get_api_key(custom_key)
        if not api_key:
            return ""

        # Try gemini-2.0-flash, then fallback to gemini-1.5-flash
        models_to_try = [self.default_model, self.fallback_model]

        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

            payload: Dict[str, Any] = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 3072,
                }
            }

            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }

            try:
                async with httpx.AsyncClient(timeout=35.0) as client:
                    resp = await client.post(url, json=payload, headers={"Content-Type": "application/json"})

                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and "content" in candidates[0]:
                            parts = candidates[0]["content"].get("parts", [])
                            if parts:
                                return parts[0].get("text", "").strip()

                    elif resp.status_code == 429:
                        # Rate limit reached on free quota
                        continue
                    else:
                        # Other API error, try fallback model
                        continue
            except Exception:
                continue

        return ""

    async def generate_project_summary(
        self,
        metadata: RepoMetadata,
        tech: TechnologyAnalysis,
        parsed_files: List[ParsedFileInfo],
        custom_key: Optional[str] = None
    ) -> AIProjectSummary:
        """
        Generates comprehensive AI project summary and architecture overview using Gemini.
        Falls back gracefully to intelligent static synthesis if no API key is provided.
        """
        key_files_summary = []
        for pf in parsed_files[:15]:
            cls_names = [c.name for c in pf.classes]
            fn_names = [f.name for f in pf.functions[:5]]
            key_files_summary.append(
                f"- `{pf.path}` ({pf.language}): Classes [{', '.join(cls_names)}], Functions [{', '.join(fn_names)}]"
            )

        tech_list = [f"{t.name} ({t.category})" for t in tech.technologies[:12]]
        prompt = f"""
You are an expert software architect evaluating a GitHub repository for an MCA Mini Project Viva & Review.
Repository: {metadata.full_name}
Description: {metadata.description or 'No description provided'}
Primary Language: {tech.primary_language}
Detected Tech Stack: {', '.join(tech_list)}
Total Files: {tech.total_files} ({tech.total_bytes / 1024:.1f} KB)

Key Source Files Analyzed:
{chr(10).join(key_files_summary)}

README Snippet:
{(metadata.readme_content or '')[:1200]}

Please provide a structured technical evaluation in JSON format with the following keys:
- "summary": A concise 2-3 paragraph explanation of what this application does, its core purpose, and who it is for.
- "architecture_overview": A technical explanation of the system architecture, design patterns, separation of concerns, and data flow.
- "key_features": A list of 4-6 prominent technical features implemented in the codebase.
- "core_modules": A list of 3-5 objects with "name" and "responsibility" detailing the major directories/modules.
- "design_patterns": A list of 3-5 software design patterns observed (e.g. MVC, Repository Pattern, Dependency Injection, RESTful API, Observer).

Respond ONLY with valid JSON.
"""
        response_text = await self._call_gemini_api(
            prompt=prompt,
            system_instruction="You are a senior software architect and academic project examiner. Return ONLY clean JSON.",
            custom_key=custom_key
        )

        if response_text:
            try:
                # Clean code fences if present
                clean_json = response_text
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0]
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0]

                data = json.loads(clean_json.strip())
                return AIProjectSummary(
                    summary=data.get("summary", ""),
                    architecture_overview=data.get("architecture_overview", ""),
                    key_features=data.get("key_features", []),
                    core_modules=data.get("core_modules", []),
                    design_patterns=data.get("design_patterns", [])
                )
            except Exception:
                pass

        # Intelligent static fallback when no API key or during offline review
        return self._generate_fallback_summary(metadata, tech, parsed_files)

    def _generate_fallback_summary(
        self,
        metadata: RepoMetadata,
        tech: TechnologyAnalysis,
        parsed_files: List[ParsedFileInfo]
    ) -> AIProjectSummary:
        """Rule-based intelligent project summary when Gemini API key is absent."""
        tech_names = [t.name for t in tech.technologies[:5]] or [tech.primary_language]
        summary = (
            f"{metadata.name} is a {tech.primary_language}-based software repository "
            f"developed with {', '.join(tech_names)}. "
            f"{metadata.description or 'The codebase provides modular components structured for development and maintainability.'} "
            f"The repository contains {tech.total_files} files across {tech.total_directories} directories with a primary codebase composed of {tech.primary_language}."
        )

        architecture = (
            f"The application follows a modular client-server or component-based structure typical of {tech.primary_language} projects. "
            f"Static source analysis detected {len(parsed_files)} primary source modules with distinct separation between "
            f"entry points, core business logic, data models, and utility handlers. "
            f"Declared dependencies are managed through standard package manifests ({', '.join(set(t.source_file for t in tech.technologies)) or 'project configuration'})."
        )

        features = [
            f"Automated static structure organized in {tech.primary_language}",
            f"Dependency management utilizing {', '.join(set(t.name for t in tech.technologies[:3])) or 'native tools'}",
            f"Modular function and class definitions for testability and reuse",
            "Clear separation of entry points and domain logic"
        ]

        modules = []
        for pf in parsed_files[:4]:
            modules.append({
                "name": pf.path,
                "responsibility": f"Implements core {pf.language} logic with {len(pf.functions)} functions and {len(pf.classes)} classes."
            })

        return AIProjectSummary(
            summary=summary,
            architecture_overview=architecture,
            key_features=features,
            core_modules=modules,
            design_patterns=["Layered Architecture", "Modular Design", "Single Responsibility Principle"]
        )

    async def explain_code_file(
        self,
        file_path: str,
        code_content: str,
        parsed_info: Optional[ParsedFileInfo],
        custom_key: Optional[str] = None
    ) -> AIFileExplanation:
        """Explains a specific code file, its functions, classes, and potential edge cases."""
        prompt = f"""
Analyze the following source code file from a software repository:
File: {file_path}
Language: {parsed_info.language if parsed_info else 'Unknown'}

Source Code (first 350 lines):
{code_content[:8000]}

Provide an explanation in JSON with:
- "overview": Clear 1-2 paragraph summary of the file's purpose and functionality.
- "role_in_project": How this file connects with the rest of the application.
- "functions_explained": List of objects with "name" and "explanation" for key functions/methods.
- "potential_improvements": List of 2-3 code quality, performance, or security suggestions.

Return ONLY clean JSON.
"""
        response_text = await self._call_gemini_api(
            prompt=prompt,
            system_instruction="You are an expert static code reviewer. Return ONLY valid JSON.",
            custom_key=custom_key
        )

        if response_text:
            try:
                clean_json = response_text
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0]
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0]

                data = json.loads(clean_json.strip())
                return AIFileExplanation(
                    file_path=file_path,
                    overview=data.get("overview", ""),
                    role_in_project=data.get("role_in_project", ""),
                    functions_explained=data.get("functions_explained", []),
                    potential_improvements=data.get("potential_improvements", [])
                )
            except Exception:
                pass

        # Static fallback
        funcs = []
        if parsed_info:
            for f in parsed_info.functions[:4]:
                funcs.append({
                    "name": f.name,
                    "explanation": f"Accepts ({', '.join(f.arguments)}) and returns {f.return_type or 'untyped value'}."
                })

        return AIFileExplanation(
            file_path=file_path,
            overview=f"`{file_path}` contains {parsed_info.loc if parsed_info else 'several'} lines of code defining key components for the application.",
            role_in_project="Serves as an integral source module coordinating functionality within its parent directory.",
            functions_explained=funcs,
            potential_improvements=["Add docstrings and type annotations", "Ensure thorough unit test coverage"]
        )

    async def answer_repository_chat(
        self,
        question: str,
        repo_context: Dict[str, Any],
        custom_key: Optional[str] = None,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> AIChatResponse:
        """Answers developer/student questions grounded in the repository context."""
        meta = repo_context.get("metadata", {})
        tech = repo_context.get("technology", {})
        parsed_files = repo_context.get("parsed_code", [])

        file_list_summary = []
        for pf in parsed_files[:20]:
            fns = [f.get("name", "") for f in pf.get("functions", [])[:4]]
            file_list_summary.append(f"- {pf.get('path')} (Functions: {', '.join(fns)})")

        system_prompt = (
            "You are an AI code assistant for GitHub Project Analyzer. "
            "Your job is to answer questions about the analyzed repository accurately and clearly. "
            "Where possible, cite specific file paths. If information cannot be verified or is not present "
            "in the repository, communicate uncertainty honestly."
        )

        user_prompt = f"""
Repository: {meta.get('full_name')}
Description: {meta.get('description')}
Primary Language: {tech.get('primary_language')}
Technologies: {', '.join([t.get('name', '') for t in tech.get('technologies', [])[:10]])}

Repository Source Modules:
{chr(10).join(file_list_summary)}

User Question: {question}

Please answer the user's question accurately, citing specific files from the repository where relevant.
"""
        ans = await self._call_gemini_api(
            prompt=user_prompt,
            system_instruction=system_prompt,
            custom_key=custom_key
        )

        if not ans:
            # Fallback when key is missing or offline
            ans = (
                f"Based on the static analysis of **{meta.get('full_name', 'this repository')}**, "
                f"the project is built in **{tech.get('primary_language', 'its primary language')}** using "
                f"frameworks like {', '.join([t.get('name', '') for t in tech.get('technologies', [])[:3]]) or 'standard modules'}. "
                f"\n\nTo enable full real-time AI explanations and deep conversational answers, please add your "
                f"**Google Free Gemini API Key** in the settings modal (obtainable for free at https://aistudio.google.com/)."
            )

        # Detect referenced files in answer
        referenced = []
        for pf in parsed_files:
            p = pf.get("path", "")
            if p and (p in ans or p.split("/")[-1] in ans):
                referenced.append(p)

        return AIChatResponse(
            answer=ans,
            referenced_files=referenced[:5]
        )

    async def compare_repositories(
        self,
        repositories: List[RepoComparisonItem],
        objective: str,
        objective_label: str,
        custom_key: Optional[str] = None
    ) -> AIComparisonRecommendation:
        """
        Generates an in-depth AI comparison across 2 or 3 GitHub repositories using Google Gemini.
        Returns comparative categories, strengths/weaknesses, differences, and a reasoned final verdict.
        Falls back smoothly to static comparative analysis if the API key is unavailable.
        """
        repo_data_summaries = []
        for r in repositories:
            tech_names = [f"{t.name} ({t.category})" for t in r.technology.technologies[:10]]
            scores = r.scores
            repo_data_summaries.append(f"""
=== REPOSITORY: {r.full_name} ===
URL: {r.repo_url}
Description: {r.metadata.description or 'No description provided'}
Primary Language: {r.technology.primary_language}
GitHub Stars: {r.measured_metrics.stars} | Forks: {r.measured_metrics.forks} | Issues: {r.measured_metrics.open_issues}
Size: {r.measured_metrics.size_kb} KB | Total Files: {r.measured_metrics.total_files} | Total Dirs: {r.measured_metrics.total_directories}
Source Files: {r.measured_metrics.source_files_count} | Test Files: {r.measured_metrics.test_files_count} | Doc Files: {r.measured_metrics.doc_files_count}
Parsed Classes: {r.measured_metrics.total_classes} | Parsed Functions: {r.measured_metrics.total_functions} | Docstring Coverage: {r.measured_metrics.docstring_coverage_pct}%
License: {r.metadata.license or 'None explicitly detected'}
Last Updated: {r.metadata.updated_at or 'Unknown'}
Technologies Detected: {', '.join(tech_names) or 'None in manifests'}
Scores (0-100):
  - Overall Weighted Score: {r.weighted_score} (Rank: #{r.rank})
  - Code Quality: {scores.code_quality.score}
  - Architecture: {scores.architecture.score}
  - Documentation: {scores.documentation.score}
  - Testing: {scores.testing.score}
  - Maintainability: {scores.maintainability.score}
  - Technology: {scores.technology.score}
  - Activity: {scores.activity.score}
  - Security: {scores.security.score}
""")

        prompt = f"""
You are an expert software engineering reviewer and computer science academic evaluator.
Evaluate and compare the following {len(repositories)} GitHub repositories side by side.
Comparison Objective chosen by user: "{objective_label}" ({objective}).

{chr(10).join(repo_data_summaries)}

IMPORTANT EVALUATION RULES:
1. Ground your answers strictly in the provided data. Do not hallucinate or invent missing metrics or features.
2. If certain information is missing (e.g. test files or license), explicitly state that it could not be determined from repository manifests.
3. Do not assume high stars mean high code quality.
4. For each recommendation category, specify the exact repository full_name as "winner_repo" and explain WHY with concrete evidence.
5. Provide genuine, balanced strengths and weaknesses for EACH repository.

Return ONLY a JSON object with this exact structure:
{{
  "summary": "2-3 paragraphs comparing the projects, their paradigms, and overall impressions.",
  "best_overall": {{
    "winner_repo": "owner/repo",
    "title": "Best Repository Overall",
    "reasoning": "Detailed reasoning based on code quality, architecture, and maintainability."
  }},
  "best_for_beginners": {{
    "winner_repo": "owner/repo",
    "title": "Best for Beginners",
    "reasoning": "Reasoning based on simplicity, documentation, and ease of reading."
  }},
  "best_for_advanced": {{
    "winner_repo": "owner/repo",
    "title": "Best for Advanced Developers",
    "reasoning": "Reasoning based on architectural complexity, patterns, and depth."
  }},
  "best_for_learning": {{
    "winner_repo": "owner/repo",
    "title": "Best for Learning New Technologies",
    "reasoning": "Reasoning based on modern tech stack and idiomatic usage."
  }},
  "best_for_academic": {{
    "winner_repo": "owner/repo",
    "title": "Best for MCA Students & Academic Projects",
    "reasoning": "Reasoning based on viva examination defense, modularity, and report suitability."
  }},
  "best_architecture": {{
    "winner_repo": "owner/repo",
    "title": "Best in Terms of Architecture",
    "reasoning": "Reasoning based on separation of concerns, dependency structure, and design patterns."
  }},
  "best_maintainability": {{
    "winner_repo": "owner/repo",
    "title": "Best in Terms of Maintainability",
    "reasoning": "Reasoning based on file sizes, documentation, and code organization."
  }},
  "strengths": {{
    "{repositories[0].full_name}": ["Strength 1", "Strength 2", "Strength 3"],
    {f'"{repositories[1].full_name}": ["Strength 1", "Strength 2", "Strength 3"]' if len(repositories) > 1 else ''}
    {f', "{repositories[2].full_name}": ["Strength 1", "Strength 2", "Strength 3"]' if len(repositories) > 2 else ''}
  }},
  "weaknesses": {{
    "{repositories[0].full_name}": ["Weakness 1", "Weakness 2"],
    {f'"{repositories[1].full_name}": ["Weakness 1", "Weakness 2"]' if len(repositories) > 1 else ''}
    {f', "{repositories[2].full_name}": ["Weakness 1", "Weakness 2"]' if len(repositories) > 2 else ''}
  }},
  "key_differences": [
    "Difference 1 regarding architecture, tech stack, or testing",
    "Difference 2 regarding project scope, maintenance, or complexity",
    "Difference 3 regarding suitability for specific use cases"
  ],
  "final_verdict": "Comprehensive concluding paragraph recommending which repository to choose based on user objectives and trade-offs."
}}
"""

        response_text = await self._call_gemini_api(
            prompt=prompt,
            system_instruction="You are a senior software engineering evaluator. Compare repositories objectively. Return ONLY valid JSON.",
            custom_key=custom_key,
            temperature=0.3
        )

        if response_text:
            try:
                clean_json = response_text
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0]
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0]

                data = json.loads(clean_json.strip())

                def parse_cat(cat_key: str, default_title: str) -> RecommendationCategory:
                    cat_obj = data.get(cat_key, {})
                    w_repo = cat_obj.get("winner_repo") or repositories[0].full_name
                    # Make sure w_repo matches one of the compared repos
                    matched = next((r.full_name for r in repositories if r.full_name.lower() == str(w_repo).lower()), repositories[0].full_name)
                    return RecommendationCategory(
                        winner_repo=matched,
                        title=cat_obj.get("title", default_title),
                        reasoning=cat_obj.get("reasoning", "Detailed comparative analysis determined this repository as the most suitable.")
                    )

                return AIComparisonRecommendation(
                    summary=data.get("summary", ""),
                    best_overall=parse_cat("best_overall", "Best Repository Overall"),
                    best_for_beginners=parse_cat("best_for_beginners", "Best for Beginners"),
                    best_for_advanced=parse_cat("best_for_advanced", "Best for Advanced Developers"),
                    best_for_learning=parse_cat("best_for_learning", "Best for Learning New Technologies"),
                    best_for_academic=parse_cat("best_for_academic", "Best for MCA Students & Academic Projects"),
                    best_architecture=parse_cat("best_architecture", "Best Architecture"),
                    best_maintainability=parse_cat("best_maintainability", "Best Maintainability"),
                    strengths=data.get("strengths", {}),
                    weaknesses=data.get("weaknesses", {}),
                    key_differences=data.get("key_differences", []),
                    final_verdict=data.get("final_verdict", ""),
                    is_ai_generated=True
                )
            except Exception:
                pass

        # Static fallback
        return self._generate_fallback_comparison(repositories, objective, objective_label)

    def _generate_fallback_comparison(
        self,
        repositories: List[RepoComparisonItem],
        objective: str,
        objective_label: str
    ) -> AIComparisonRecommendation:
        """
        Rule-based heuristic comparison synthesis when Gemini API key is absent or offline.
        Uses measured metrics, category scores, and objective weighting.
        """
        top_repo = repositories[0]
        runner_up = repositories[1] if len(repositories) > 1 else top_repo

        repo_names = [r.full_name for r in repositories]
        summary = (
            f"Comparative analysis was performed across {len(repositories)} repositories: {', '.join(repo_names)}. "
            f"Under the objective '{objective_label}', **{top_repo.full_name}** achieved the top score of "
            f"{top_repo.weighted_score}/100, followed by **{runner_up.full_name}** ({runner_up.weighted_score}/100). "
            f"The evaluation analyzed source code structure, testing coverage, documentation completeness, and technological architecture."
        )

        # Determine category winners based on category scores
        def find_best_by_score(cat_name: str) -> RepoComparisonItem:
            return max(repositories, key=lambda r: getattr(r.scores, cat_name).score)

        best_arch = find_best_by_score("architecture")
        best_maint = find_best_by_score("maintainability")
        best_doc = find_best_by_score("documentation")
        best_cq = find_best_by_score("code_quality")
        best_tech = find_best_by_score("technology")

        strengths: Dict[str, List[str]] = {}
        weaknesses: Dict[str, List[str]] = {}

        for r in repositories:
            r_strengths = []
            r_weaknesses = []

            if r.measured_metrics.test_files_count > 0:
                r_strengths.append(f"Includes {r.measured_metrics.test_files_count} test files for automated verification.")
            else:
                r_weaknesses.append("No automated test suite detected in repository files.")

            if r.metadata.has_readme and len(r.metadata.readme_content or "") > 800:
                r_strengths.append("Comprehensive README documentation with usage guidelines.")
            elif not r.metadata.has_readme:
                r_weaknesses.append("Missing README document, making initial onboarding difficult.")

            if r.measured_metrics.total_classes > 0:
                r_strengths.append(f"Well-structured object-oriented design with {r.measured_metrics.total_classes} classes.")

            if r.metadata.license:
                r_strengths.append(f"Explicit open-source license: {r.metadata.license}.")
            else:
                r_weaknesses.append("No open-source license explicitly detected; commercial or academic usage rights unclarified.")

            if r.measured_metrics.docstring_coverage_pct < 10.0:
                r_weaknesses.append(f"Low in-code docstring coverage ({r.measured_metrics.docstring_coverage_pct}%).")

            if not r_strengths:
                r_strengths.append(f"Clean {r.technology.primary_language} repository structure.")
            if not r_weaknesses:
                r_weaknesses.append("Could benefit from broader CI/CD workflow manifests.")

            strengths[r.full_name] = r_strengths
            weaknesses[r.full_name] = r_weaknesses

        key_differences = [
            f"Primary Language & Tooling: {', '.join([f'{r.full_name} ({r.technology.primary_language})' for r in repositories])}.",
            f"Codebase Scale: {', '.join([f'{r.full_name} ({r.measured_metrics.total_files} files, {r.measured_metrics.size_kb} KB)' for r in repositories])}.",
            f"Testing & Verification: {', '.join([f'{r.full_name} ({r.measured_metrics.test_files_count} test files)' for r in repositories])}."
        ]

        final_verdict = (
            f"For the selected objective of '{objective_label}', **{top_repo.full_name}** is the recommended choice. "
            f"It demonstrated stronger relative performance in {best_arch.full_name == top_repo.full_name and 'system architecture, ' or ''}"
            f"maintainability ({top_repo.scores.maintainability.score}/100), and code organization. "
            f"However, if specific focus is placed on learning or documentation, compare the individual score breakdowns above."
        )

        return AIComparisonRecommendation(
            summary=summary,
            best_overall=RecommendationCategory(
                winner_repo=top_repo.full_name,
                title="Best Repository Overall",
                reasoning=f"Achieved the highest composite score of {top_repo.weighted_score}/100 across measured quality, maintainability, and architectural criteria."
            ),
            best_for_beginners=RecommendationCategory(
                winner_repo=best_doc.full_name,
                title="Best for Beginners",
                reasoning=f"{best_doc.full_name} offers the most accessible documentation and clearer onboarding guides (Documentation score: {best_doc.scores.documentation.score}/100)."
            ),
            best_for_advanced=RecommendationCategory(
                winner_repo=best_arch.full_name,
                title="Best for Advanced Developers",
                reasoning=f"{best_arch.full_name} shows greater structural depth and module segregation (Architecture score: {best_arch.scores.architecture.score}/100)."
            ),
            best_for_learning=RecommendationCategory(
                winner_repo=best_tech.full_name,
                title="Best for Learning New Technologies",
                reasoning=f"{best_tech.full_name} leverages a diverse tech stack with {best_tech.measured_metrics.technologies_count} identified components."
            ),
            best_for_academic=RecommendationCategory(
                winner_repo=top_repo.full_name,
                title="Best for MCA Students & Academic Projects",
                reasoning=f"Strong balance of architectural clarity and viva explainability, with clear separation of concerns."
            ),
            best_architecture=RecommendationCategory(
                winner_repo=best_arch.full_name,
                title="Best Architecture",
                reasoning=f"Highest architecture score ({best_arch.scores.architecture.score}/100) with clear entry points and dependency graphs."
            ),
            best_maintainability=RecommendationCategory(
                winner_repo=best_maint.full_name,
                title="Best Maintainability",
                reasoning=f"Highest maintainability score ({best_maint.scores.maintainability.score}/100) reflecting modular file sizing and clean organization."
            ),
            strengths=strengths,
            weaknesses=weaknesses,
            key_differences=key_differences,
            final_verdict=final_verdict,
            is_ai_generated=False
        )

gemini_service = GeminiService()
