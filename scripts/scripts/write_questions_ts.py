"""Write the validated PDF question report as the TypeScript question bank."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    report = json.loads(args.report.read_text(encoding="utf-8"))
    if report.get("issueCount") != 0:
        raise SystemExit(f"Refusing to write a question bank with {report['issueCount']} extraction issues.")

    questions = [
        {
            "id": question["id"],
            "category": question["category"],
            "prompt": question["prompt"],
            "choices": question["choices"],
            "correctChoiceId": question["correctChoiceId"],
        }
        for question in report["questions"]
    ]
    source = (
        "import type { QuizQuestion } from '../types';\n\n"
        "// Imported verbatim from the supplied test-bank PDF. Only PDF line wrapping was joined.\n"
        "export const questionBank: QuizQuestion[] = "
        + json.dumps(questions, ensure_ascii=False, indent=2)
        + ";\n"
    )
    args.output.write_text(source, encoding="utf-8")
    print(f"wrote {len(questions)} questions to {args.output}")


if __name__ == "__main__":
    main()
