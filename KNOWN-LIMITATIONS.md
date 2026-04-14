# Known Limitations (Community Help Wanted)

This document tracks current behavior gaps that are not always reproducible, so community contributors can help investigate and improve them.

## 1) Memory Retrieval Quality Variance

- In some chats, memory retrieval is relevant and helpful.
- In other chats, retrieved memory can be weak or less aligned with user intent.
- This appears to be intermittent rather than consistently failing.

## 2) Small Model Answer Quality Variance

- Smaller local models can sometimes return good answers.
- In other cases, they may produce low-quality or incomplete responses.
- This is more noticeable on nuanced, multi-step, or context-heavy prompts.

## Contributor Direction

- Reproduce these behaviors with clear prompt examples.
- Compare outputs across different model sizes and settings.
- Propose fixes with measurable before/after quality checks.
