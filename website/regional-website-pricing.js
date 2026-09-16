// JobPilot website regional pricing bridge.
// Keeps pricing and SMS information aligned with the selected website country.
(function () {
  const pricing = {
    GB: {
      plans: { core: '£0', solo: '£7.49', team: '£24.99', business: '£59.99', pro: '£99.99' },
      sms: {
        core: '£0.035 per SMS',
        solo: '500 free SMS/month|£0.035 per SMS after allowance',
        team: '1,000 free SMS/month|£0.035 per SMS after allowance',
        business: '1,500 free SMS/month|£0.035 per SMS after allowance',
        pro: '2,000 free SMS/month|£0.035 per SMS after allowance'
      }
    },
    US: {
      plans: { core: '$0', solo: '$29.99', team: '$139.99', business: '$209.99', pro: '$279.99' },
      sms: {
        core: '$0.03 per SMS',
        solo: '500 free SMS/month|$0.03 per SMS after allowance',
        team: '1,000 free SMS/month|$0.03 per SMS after allowance',
        business: '1,500 free SMS/month|$0.03 per SMS after allowance',
        pro: '2,000 free SMS/month|$0.03 per SMS after allowance'
      }
    },
    CA: {
      plans: { core: 'C$0', solo: 'C$39.99', team: 'C$179.99', business: 'C$269.99', pro: 'C$359.99' },
      sms: {
        core: 'C$0.04 per SMS',
        solo: '500 free SMS/month|C$0.04 per SMS after allowance',
        team: '1,000 free SMS/month|C$0.04 per SMS after allowance',
        business: '1,500 free SMS/month|C$0.04 per SMS after allowance',
        pro: '2,000 free SMS/month|C$0.04 per SMS after allowance'
      }
    },
    AU: {
      plans: { core: 'A$0', solo: 'A$39.99', team: 'A$179.99', business: 'A$269.99', pro: 'A$359.99' },
      sms: {
        core: 'A$0.04 per SMS',
        solo: '500 free SMS/month|A$0.04 per SMS after allowance',
        team: '1,000 free SMS/month|A$0.04 per SMS after allowance',
        business: '1,500 free SMS/month|A$0.04 per SMS after allowance',
        pro: '2,000 free SMS/month|A$0.04 per SMS after allowance'
      }
    },
    IE: {
      plans: { core: '€0', solo: '€29.99', team: '€99.99', business: '€179.99', pro: '€299.99' },
      sms: {
        core: '€0.055 per SMS',
        solo: '500 free SMS/month|€0.055 per SMS after allowance',
        team: '1,000 free SMS/month|€0.055 per SMS after allowance',
        business: '1,500 free SMS/month|€0.055 per SMS after allowance',
        pro: '2,000 free SMS/month|€0.055 per SMS after allowance'
      }
    },
    NZ: {
      plans: { core: 'NZ$0', solo: 'NZ$39.99', team: 'NZ$179.99', business: 'NZ$269.99', pro: 'NZ$359.99' },
      sms: {
        core: 'NZ$0.13 per SMS',
        solo: '0 free SMS/month|NZ$0.13 per SMS',
        team: '0 free SMS/month|NZ$0.13 per SMS',
        business: '0 free SMS/month|NZ$0.13 per SMS',
        pro: '0 free SMS/month|NZ$0.13 per SMS'
      }
    }
  };

  const COUNTRY_KEY = 'jobpilot_selected_country';
  const LEGACY_COUNTRY_KEY = 'jobpilot_country';

  function getCountry() {
    const selected = String(
      localStorage.getItem(COUNTRY_KEY) ||
      localStorage.getItem(LEGACY_COUNTRY_KEY) ||
      'GB'
    ).toUpperCase();

    return pricing[selected] ? selected : 'GB';
  }

  function updatePrices() {
    const country = getCountry();
    const data = pricing[country];
    const planNames = ['core', 'solo', 'team', 'business', 'pro'];

    document.querySelectorAll('.amount').forEach((element, index) => {
      const plan = planNames[index];
      if (plan && data.plans[plan]) {
        element.innerHTML = data.plans[plan] + ' <span>/ month</span>';
      }
    });

    document.querySelectorAll('.sms-info').forEach((element, index) => {
      const plan = planNames[index];
      if (!plan || !data.sms[plan]) return;

      const parts = data.sms[plan].split('|');
      element.innerHTML = parts.length > 1
        ? parts[0] + '<br><span>' + parts[1] + '</span>'
        : parts[0];
    });

    const note = document.querySelector('.note');
    if (note) {
      note.textContent =
        'Core is free forever with no payment details required. When you need more than 25 customers, upgrade to Solo for ' +
        data.plans.solo +
        '/month.';
    }

    const selector = document.getElementById('pricing-country');
    if (selector && selector.value !== country) {
      selector.value = country;
    }
  }

  function init() {
    updatePrices();

    window.addEventListener('jobpilot-country-changed', updatePrices);

    window.addEventListener('storage', function (event) {
      if (event.key === COUNTRY_KEY || event.key === LEGACY_COUNTRY_KEY) {
        updatePrices();
      }
    });

    let lastCountry = getCountry();
    setInterval(function () {
      const currentCountry = getCountry();
      if (currentCountry !== lastCountry) {
        lastCountry = currentCountry;
        updatePrices();
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
