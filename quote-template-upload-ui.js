// Quote template administration now lives in Settings.
// Keep this compatibility module so the existing script reference does not break.
const removeLegacyTemplateControls = () => {
  document.querySelectorAll("#jpqTemplateUploadInput, #jpqTemplateUploadButton, #jpqTemplateManageButton, #jpqTemplateUploadStatus, .jpq-template-actions").forEach(el => el.remove());
};
const observer = new MutationObserver(removeLegacyTemplateControls);
observer.observe(document.body, { childList: true, subtree: true });
removeLegacyTemplateControls();
