// JobPilot website regional pricing bridge.
// Reads the country selected on the country selector and updates UK prices on the website.
(function () {
  const prices = {
    GB: { '£7.49': '£7.49', '£24.99': '£24.99', '£59.99': '£59.99', '£99.99': '£99.99' },
    US: { '£7.49': '$29.99', '£24.99': '$139.99', '£59.99': '$209.99', '£99.99': '$279.99' },
    AU: { '£7.49': 'A$39.99', '£24.99': 'A$79.99', '£59.99': 'A$149.99', '£99.99': 'A$249.99' },
    NZ: { '£7.49': 'NZ$44.99', '£24.99': 'NZ$89.99', '£59.99': 'NZ$169.99', '£99.99': 'NZ$279.99' },
    IE: { '£7.49': '€14.99', '£24.99': '€34.99', '£59.99': '€74.99', '£99.99': '€119.99' },
    CA: { '£7.49': 'C$39.99', '£24.99': 'C$79.99', '£59.99': 'C$149.99', '£99.99': 'C$249.99' }
  };

  const country = () => {
    const selected = String(localStorage.getItem('jobpilot_country') || 'GB').toUpperCase();
    return prices[selected] ? selected : 'GB';
  };

  const updatePrices = () => {
    const selected = country();
    if (selected === 'GB') return;
    const mapping = prices[selected];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      let text = node.nodeValue;
      Object.keys(prices.GB).forEach(gbp => {
        text = text.replaceAll(gbp, mapping[gbp]);
      });
      node.nodeValue = text;
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePrices);
  } else {
    updatePrices();
  }
})();
