# Known Limitations (Community Help Wanted)

This document tracks current behavior gaps that are not always reproducible, so community contributors can help investigate and improve them.

## 1) No memory between chats

- The model only sees the current conversation. Facts from earlier chats are not remembered.
- A cross-session memory feature existed in earlier versions and was removed because its quality was not good enough.

## 2) Small Model Answer Quality Variance

- Smaller local models can sometimes return good answers.
- In other cases, they may produce low-quality or incomplete responses.
- This is more noticeable on nuanced, multi-step, or context-heavy prompts.

## Contributor Direction

- Reproduce these behaviors with clear prompt examples.
- Compare outputs across different model sizes and settings.
- Propose fixes with measurable before/after quality checks.
