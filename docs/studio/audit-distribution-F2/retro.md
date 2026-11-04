# Retro — audit-distribution-F2

- Fast mode fitted: 1 implementer run, review APPROVED, 0 retries.
- What went wrong: the wrapper test first ran the real launcher because the commit guard runs verify with CLAUDE_PLUGIN_ROOT set to the real plugin; two commit attempts failed until the test set its own CLAUDE_PLUGIN_ROOT.
- Lesson candidate (not promoted, plugin-specific): tests of hook scripts must set CLAUDE_PLUGIN_ROOT themselves, since the guard runs verify inside a hook environment.
