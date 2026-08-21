# Third-Party Claude Code Skills

The skills below were vendored from public MIT-licensed GitHub repositories for use
as project-level Claude Code skills in this repository. Each folder is an unmodified
copy of the upstream `SKILL.md` (plus any accompanying scripts/data) at the commit
listed. Full MIT license text applies to each; copyright holders are named per entry.

| Skill folder(s) | Source repo | Commit | Copyright |
| --- | --- | --- | --- |
| `taste-skill`, `redesign-skill`, `output-skill` | https://github.com/Leonxlnx/taste-skill | `c607b117f37df9ce35e335b543972ca8353f327` | (c) 2026 Leonxlnx |
| `ui-ux-pro-max` | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | `bc826e2267a36d98a2dcf5231e16c30ff546770f` | (c) 2024 Next Level Builder |
| `gsap-core`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`, `gsap-frameworks`, `gsap-performance`, `gsap-utils` | https://github.com/greensock/gsap-skills | `aed9cfd3277740755f6bfc1155c7aa645403b760` | (c) 2026 GreenSock |

All three upstream repositories are distributed under the MIT License. See each
repository's own `LICENSE` file at the commit above for the full license text.

## Trimming notes

`ui-ux-pro-max`'s vendored copy was trimmed for this repo to keep it small and
because it is a React/Vite (`vinext`) + Tailwind project:

- Dropped `data/phosphor-icons-upstream.json` and `data/google-font-licenses.json`
  (raw upstream dumps used only by the upstream repo's own `scripts/validate_data.py`
  maintenance script, not by the runtime `search.py`).
- Dropped `scripts/tests/` and `scripts/validate_data.py` (upstream dev/test tooling,
  not used by the skill at runtime).
- Kept only 4 of the upstream's 22 `data/stacks/*.csv` files: `react`, `nextjs`,
  `html-tailwind`, `shadcn`. Fetch any other stack file from the source repo above
  if a future task needs it (e.g. `vue`, `svelte`, `flutter`).
