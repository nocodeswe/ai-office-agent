Summary: Implemented real document editing for agent mode through a client-side office-plan protocol and Office.js executor, so Word and Excel changes can now be proposed by the model and applied safely in the add-in. Added a clear new-chat reset flow and changelog write API so successful operations are auditable. Reworked provider settings to make model visibility selection searchable and manageable, and fixed light-theme contrast by updating shared CSS surfaces and Ant Design theme tokens.

Included work:
- Added Office agent plan parsing/execution for Word and Excel operations, including more granular text, range, formatting, and sheet actions.
- Added a New chat action in the main chat UI.
- Added changelog POST support for applied document operations.
- Redesigned provider model selection with search, filtering, select-all, clear, and simpler default-model controls.
- Improved light-theme readability across settings cards, inputs, chips, message surfaces, and Ant Design component tokens.
- Replaced the remaining native browser confirmation with Ant Design modal confirmation.
- Added more precise Word table cell, paragraph style, paragraph formatting, and Excel range border/format/resize/merge tools.

Validation:
- Production build completed successfully with `npm run build`.

Next steps:
- Verify the new Office operation set in the Word and Excel hosts you use most often.
- Extend the plan protocol if you want multi-step read-then-act loops or richer host-specific actions.