// Keeps the existing billing UI price display aligned with the selected market.
(function () {
  const prices = {
    GB: { '£7.49': '£7.49', '£24.99': '£24.99', '£59.99': '£59.99', '£99.99': '£99.99' },
    US: { '£7.49': '$29.99', '£24.99': '$139.99', '£59.99': '$209.99', '£99.99': '$279.99' },
    AU: { '£7.49': 'A$39.99', '£24.99': 'A$179.99', '£59.99': 'A$269.99', '£99.99': 'A$359.99' },
    NZ: { '£7.49': 'NZ$39.99', '£24.99': 'NZ$179.99', '£59.99': 'NZ$269.99', '£99.99': 'NZ$359.99' },
    IE: { '£7.49': '€29.99', '£24.99': '€99.99', '£59.99': '€179.99', '£99.99': '€299.99' },
    CA: { '£7.49': 'C$39.99', '£24.99': 'C$179.99', '£59.99': 'C$269.99', '£99.99': 'C$359.99' }
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
      Object.entries(prices.GB).forEach(([gb]) => {
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
