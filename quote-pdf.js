// Quote PDF compatibility bridge. The detailed generator lives in quote-builder.js.
// This file intentionally contains no second PDF observer so the old print-only
// implementation cannot create duplicate buttons or bypass quote templates.

const install = () => {
  if (window.__jobpilotGenerateQuotePdf) return;
  setTimeout(install, 100);
};
install();
