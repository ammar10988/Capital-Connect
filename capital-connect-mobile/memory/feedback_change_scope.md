---
name: change-scope-discipline
description: Only modify files explicitly in scope of the user's request — do not expand scope
type: feedback
---

Only touch files that are explicitly named or clearly implied by the user's request. When asked to fix a specific component (e.g. "bottom tab bar only"), do not also modify other files even if they have related issues.

**Why:** User explicitly interrupted and corrected when changes were made to 10+ files (news, trending, browse-investors, login, register, profile, funding, investors, InvestorCard, NewsCard) when the task scope was only the bottom tab bar. This required a large manual revert session.

**How to apply:** Before making any edit, confirm the file is in scope. If in doubt, ask. Scope creep wastes time and requires reverting.
