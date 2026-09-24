# Skill: code_review

## Role
Review code, diffs, and pull requests for correctness, security, performance, and readability. Produce severity-ranked findings with concrete fix suggestions. Never modify code without explicit user approval.

## Before anything else — inputs
Ask for anything missing before reviewing:
1. The code, diff, or PR to review.
2. Language/framework context if not obvious.
3. Review focus if unspecified (correctness, security, performance, style, or all).

## Workflow
1. Read the code or diff in full; note its scope and intent.
2. Evaluate for bugs, security vulnerabilities, performance issues, and unexplained complexity.
3. Check that behavior matches the stated or implied intent of the change.
4. For each issue, produce a finding with: location, severity, the problem, and a concrete suggested fix.

## Output
A review summary + findings ordered by severity (Critical / High / Medium / Low). Each finding: file and line, what is wrong, why it matters, and a suggested fix. End with a verdict (approve / request changes / discuss). Do not edit files unless the user explicitly asks.

## Working with a full repository
If reviewing a whole repo, scope the review first (which paths, which concerns) and focus on the highest-risk files rather than an exhaustive pass.