"""Extract the supplied test-bank PDF into a reviewable question report.

The parser only normalizes PDF line wrapping. It does not rewrite question or
choice wording, and it refuses to emit a question when its answer key or
choice structure is incomplete.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import pdfplumber


CATEGORY_RE = re.compile(r"^\s*HGE\s+\d+\s+[—–-]\s+TERMS\s*$", re.IGNORECASE)
QUESTION_RE = re.compile(r"^\s*(\d+)\.\s+(.+?)\s*$")
CHOICE_RE = re.compile(r"^\s*([A-F])\.\s+(.+?)\s*$")
ANSWER_RE = re.compile(r"^\s*ANSWER:\s*([A-F])(?:\.\s*(.*))?\s*$", re.IGNORECASE)
PAGE_CONTINUATION_RE = re.compile(r"^\s*[—–-]\s*PAGE\s+\d+\s*$", re.IGNORECASE)


def normalize_line(value: str) -> str:
    """Join only layout whitespace introduced by PDF line wrapping."""

    return re.sub(r"\s+", " ", value).strip()


def looks_like_heading(value: str) -> bool:
    """Recognize section headings without treating question prose as metadata."""

    normalized = normalize_line(value)
    if not normalized or len(normalized) > 100 or normalized.endswith((".", ":", "?")):
        return False
    if PAGE_CONTINUATION_RE.match(normalized):
        return True
    letters = [character for character in normalized if character.isalpha()]
    return bool(letters) and all(character.isupper() for character in letters)


def extract_questions(pdf_path: Path) -> dict[str, Any]:
    questions: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    category = "Uncategorized"
    category_pending = False
    current_page = 0

    def add_issue(kind: str, detail: str, item: dict[str, Any] | None = None) -> None:
        issue: dict[str, Any] = {"kind": kind, "detail": detail}
        if item is not None:
            issue["questionNumber"] = item.get("number")
            issue["category"] = item.get("category")
            issue["page"] = item.get("page")
            issue["prompt"] = item.get("prompt", "")
        issues.append(issue)

    def finalize() -> None:
        nonlocal current
        if current is None:
            return

        if current.get("answerLetter") is None:
            add_issue("missing-answer", "No ANSWER line was found.", current)
        if not 2 <= len(current["choices"]) <= 6:
            add_issue(
                "invalid-choice-count",
                f"Expected 2–6 choices, found {len(current['choices'])}.",
                current,
            )
        answer_letter = current.get("answerLetter")
        choice_letters = {choice["id"] for choice in current["choices"]}
        if answer_letter is not None and answer_letter not in choice_letters:
            add_issue("answer-choice-missing", f"Answer {answer_letter} is not one of the choices.", current)
        answer_text = normalize_line(current.get("answerText", ""))
        matching_choice = next(
            (choice["label"] for choice in current["choices"] if choice["id"] == answer_letter),
            None,
        )
        # Editorial notes and the next section heading can follow the answer
        # on the same extracted text flow. The authoritative part is the
        # answer letter; accept a clean prefix and keep the choice untouched.
        if matching_choice is not None and answer_text and not answer_text.startswith(matching_choice):
            add_issue(
                "answer-text-mismatch",
                f"Answer text differs from choice {answer_letter}: {answer_text!r} != {matching_choice!r}.",
                current,
            )

        questions.append(
            {
                "id": f"pdf-{len(questions) + 1:04d}",
                "category": current["category"],
                "sourceNumber": current["number"],
                "sourcePage": current["page"],
                "prompt": normalize_line(current["prompt"]),
                "choices": [
                    {"id": choice["id"].lower(), "label": normalize_line(choice["label"])}
                    for choice in current["choices"]
                ],
                "correctChoiceId": (answer_letter or "").lower(),
            }
        )
        current = None

    with pdfplumber.open(pdf_path) as document:
        for current_page, page in enumerate(document.pages, start=1):
            text = page.extract_text() or ""
            for raw_line in text.splitlines():
                line = raw_line.replace("\ufeff", "").strip()
                if not line:
                    continue

                if CATEGORY_RE.match(line):
                    finalize()
                    category = normalize_line(line)
                    category_pending = True
                    continue

                question_match = QUESTION_RE.match(line)
                if question_match:
                    finalize()
                    current = {
                        "number": int(question_match.group(1)),
                        "category": category,
                        "page": current_page,
                        "prompt": question_match.group(2),
                        "choices": [],
                        "answerLetter": None,
                        "answerText": "",
                        "section": "prompt",
                    }
                    category_pending = False
                    continue

                if current is None:
                    if looks_like_heading(line):
                        heading = normalize_line(line)
                        if category_pending:
                            category = normalize_line(f"{category} {heading}")
                        else:
                            category = heading
                        category_pending = True
                    else:
                        category_pending = False
                    continue

                if current["section"] == "answer" and looks_like_heading(line):
                    finalize()
                    category = normalize_line(line)
                    category_pending = True
                    continue

                answer_match = ANSWER_RE.match(line)
                if answer_match:
                    current["answerLetter"] = answer_match.group(1).upper()
                    current["answerText"] = answer_match.group(2) or ""
                    current["section"] = "answer"
                    continue

                choice_match = CHOICE_RE.match(line)
                if choice_match and current["section"] != "answer":
                    current["choices"].append(
                        {"id": choice_match.group(1).upper(), "label": choice_match.group(2)}
                    )
                    current["section"] = "choice"
                    continue

                # A line that continues a wrapped prompt or choice belongs to
                # the current field. Answer text is retained for verification
                # but is never used to alter the choice shown to players.
                if current["section"] == "prompt":
                    current["prompt"] += f" {line}"
                elif current["section"] == "choice" and current["choices"]:
                    current["choices"][-1]["label"] += f" {line}"
                elif current["section"] == "answer":
                    current["answerText"] += f" {line}"

    finalize()

    samples = questions[:3] + questions[-3:] if len(questions) > 6 else questions
    return {
        "pdf": str(pdf_path),
        "pageCount": current_page,
        "questionCount": len(questions),
        "issueCount": len(issues),
        "issues": issues,
        "categories": sorted({question["category"] for question in questions}),
        "samples": samples,
        "questions": questions,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("pdf", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    report = extract_questions(args.pdf)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"pages={report['pageCount']} questions={report['questionCount']} "
        f"issues={report['issueCount']} output={args.output}"
    )
    for issue in report["issues"][:20]:
        print(json.dumps(issue, ensure_ascii=False))


if __name__ == "__main__":
    main()
