// Keeps the existing billing UI price display aligned with the selected market.
(function () {
  const prices = {
    GB: { '£7.49': '£7.49', '£24.99': '£24.99', '£59.99': '£59.99', '£99.99': '£99.99' },
    US: { '£7.49': '$29.99', '£24.99': '$139.99', '£59.99': '$209.99', '£99.99': '$279.99' }
  };
  const refresh = () => {
    if (document.getElementById('pageTitle')?.textContent.trim() !== 'Billing') return;
    const country = (localStorage.getItem('jobpilot_selected_country') || 'GB').toUpperCase();
    if (!prices[country]) return;
    const walker = document.createTreeWalker(document.getElementById('pageContent') || document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      Object.entries(prices.GB).forEach(([gb, value]) => {
        text = text.replaceAll(gb, prices[country][gb]);
      });
      node.nodeValue = text;
    });
  };
  const observer = new MutationObserver(refresh);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('storage', refresh);
  setTimeout(refresh, 500);
})();
