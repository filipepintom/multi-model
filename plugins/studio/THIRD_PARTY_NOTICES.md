# Third-party components

The `studio` plugin ships the following skills, unmodified unless noted otherwise, at the version pinned in [`vendor.json`](vendor.json). Update them with `node scripts/vendor.js` (in the studio repo) after reading the new code. Each component keeps its licence text next to it, as the licences require.

| Component | Folder | Source | Licence |
|---|---|---|---|
| Impeccable | `skills/impeccable/` | https://github.com/pbakaus/impeccable | Apache-2.0 (see `skills/impeccable/LICENSE`) |
| modern-screenshot (bundled in Impeccable) | `skills/impeccable/scripts/modern-screenshot.umd.js` | https://github.com/qq15725/modern-screenshot | MIT (text below) |
| Ponytail (skill only) | `skills/ponytail/` | https://github.com/DietrichGebert/ponytail | MIT (see `skills/ponytail/LICENSE`) |
| graphify | `skills/graphify/` | https://github.com/safishamsi/graphify | MIT OR Apache-2.0; redistributed under MIT (see `skills/graphify/LICENSE`) |
| Humanizer (skill only) | `skills/humanizer/` | https://github.com/blader/humanizer | MIT (see `skills/humanizer/LICENSE`) |
| Context7, MCP usage skill | `skills/context7-mcp/` | https://github.com/upstash/context7 | MIT (see `skills/context7-mcp/LICENSE`) |

The **Context7 server** is not copied: it is a remote MCP server (`https://mcp.context7.com/mcp`) declared in `.mcp.json`. It works without a key, with usage limits. According to the skill, it sends only the library name and the question text, never code. The `ctx7` CLI (which needs Node 22.13 or newer) is not used.

## Notes

- **Impeccable:** the detector binary is not included. The launcher (`skills/impeccable/scripts/impeccable`) downloads the right binary for the operating system on first use and keeps it in a cache keyed by the pinned version. The studio hooks run it with `IMPECCABLE_NO_TELEMETRY=1`.
- **graphify:** only change is `disable-model-invocation: true`. It runs only through `/studio:graphify`, because the original description makes the skill fire on any question about code. On first use it installs the Python package `graphifyy` (uv, pipx or pip). Studio agents use the graph when `graphify-out/` exists in the project.
- **Ponytail:** only the skill is included. The original plugin's cost log, statusline and panel are not. The rules reach studio subagents through `hooks/subagent.js` and the build orchestrator through `hooks/knowledge.js`.

## modern-screenshot

Bundled as `skills/impeccable/scripts/modern-screenshot.umd.js`. The copyright line below is a placeholder based on the upstream project; check the exact line in the upstream repository before release.

```
MIT License

Copyright (c) qq15725 and modern-screenshot contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
