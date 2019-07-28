'use strict';

const query = window.location.search
  .slice(1)
  .split('&')
  .map(param => param.split('='))
  .reduce((query, [ key, value ]) => (
    query.set(key, value),
    query
  ), new Map());
const now = new Date();
const startDate = query.get('startDate') || `${now.getFullYear() - 1}-${('0' + now.getMonth()).slice(-2)}-${('0' + now.getDate()).slice(-2)}`;
const endDate = query.get('endDate') || `${now.getFullYear()}-${('0' + now.getMonth()).slice(-2)}-${('0' + now.getDate()).slice(-2)}`;
const adSource = query.get('adSource') || 'criteo';
const directChannels = query.get('directChannels') || 'direct';

clearTabs(1);
hideLoader();

document.getElementById('modal-close-button').addEventListener('click', hideModal)
window.addEventListener('click', hideModal);

function showLoader () {
  document.getElementById('loader').style.display = 'block';
}

function hideLoader () {
  document.getElementById('loader').style.display = 'none';
}

function showModal (message) {
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-container').classList.add('show-modal');
}

function hideModal (event) {
  if (
    !document.getElementById('modal-content').contains(event.target) ||
    event.target === document.getElementById('modal-close-button')
  ) {
    document.getElementById('modal-container').classList.remove('show-modal');
  }
}

function clearTabs (tabIndex) {
  if (tabIndex >= 2) {
    document.getElementById('account-tab').style.display = 'block';
  } else {
    document.getElementById('account-tab').style.display = 'none';
  }

  if (tabIndex >= 3) {
    document.getElementById('property-tab').style.display = 'block';
  } else {
    document.getElementById('property-tab').style.display = 'none';
  }

  if (tabIndex >= 4) {
    document.getElementById('view-tab').style.display = 'block';
  } else {
    document.getElementById('view-tab').style.display = 'none';
  }

  if (tabIndex >= 5) {
    document.getElementById('first-of-path-tab').style.display = 'block';
    document.getElementById('middle-of-path-tab').style.display = 'block';
    document.getElementById('last-of-path-tab').style.display = 'block';
    document.getElementById('footer-tab').style.display = 'block';
  } else {
    document.getElementById('first-of-path-tab').style.display = 'none';
    document.getElementById('middle-of-path-tab').style.display = 'none';
    document.getElementById('last-of-path-tab').style.display = 'none';
    document.getElementById('footer-tab').style.display = 'none';
  }

  if (tabIndex <= 2) {
    const accountsContainer = document.getElementById('account-list');
    while (accountsContainer.firstChild) {
      accountsContainer.removeChild(accountsContainer.firstChild);
    }
  }

  if (tabIndex <= 3) {
    const propertiesContainer = document.getElementById('property-list');
    while (propertiesContainer.firstChild) {
      propertiesContainer.removeChild(propertiesContainer.firstChild);
    }
  }

  if (tabIndex <= 4) {
    const viewsContainer = document.getElementById('view-list');
    while (viewsContainer.firstChild) {
      viewsContainer.removeChild(viewsContainer.firstChild);
    }
  }
}

function signIn (event) {
  showLoader();
  gapi.auth2
    .getAuthInstance()
    .signIn()
    .then(user => {
      gapi.client.analytics.management.accounts
        .list()
        .then(accounts => {
          hideLoader();
          console.log('accounts=', accounts);

          const accountsContainer = document.getElementById('account-list');
          clearTabs(2);

          document.getElementById('account-no-data').style.display = accounts.result.items.length === 0
            ? 'block'
            : 'none';

          accounts.result.items.forEach(account => {
            const accountItem = document.createElement('li');
            const accountButton = document.createElement('button');
            accountButton.textContent = `${account.name} (${account.id})`;
            accountButton.setAttribute('data-account-id', account.id);
            accountItem.appendChild(accountButton);
            accountsContainer.appendChild(accountItem);
          });

          document.getElementById('account-tab').scrollIntoView({ behavior: 'smooth' });
        })
        .catch(err => {
          hideLoader();
          showModal(err.details);
        })
    })
    .catch(err => {
      hideLoader();
      showModal(err.details);
    });
}

function selectAccount (event) {
  if (event.target.tagName !== 'BUTTON') return null;

  const accountId = event.target.getAttribute('data-account-id');

  showLoader();
  gapi.client.analytics.management.webproperties
    .list({ accountId })
    .then(properties => {
      hideLoader();
      console.log('properties=', properties);

      const propertiesContainer = document.getElementById('property-list');
      clearTabs(3);

      document.getElementById('property-no-data').style.display = properties.result.items.length === 0
        ? 'block'
        : 'none';

      properties.result.items.forEach(property => {
        const propertyItem = document.createElement('li');
        const propertyButton = document.createElement('button');
        propertyButton.textContent = `${property.name} (${property.id})`;
        propertyButton.setAttribute('data-account-id', accountId);
        propertyButton.setAttribute('data-property-id', property.id);
        propertyItem.appendChild(propertyButton);
        propertiesContainer.appendChild(propertyItem);
      });

      document.getElementById('property-tab').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(err => {
      hideLoader();
      showModal(err.details);
    });
}

function selectProperty (event) {
  if (event.target.tagName !== 'BUTTON') return null;

  const accountId = event.target.getAttribute('data-account-id');
  const propertyId = event.target.getAttribute('data-property-id');

  showLoader();
  gapi.client.analytics.management.profiles
    .list({ accountId, webPropertyId: propertyId })
    .then(views => {
      hideLoader();
      console.log('views=', views);

      const viewsContainer = document.getElementById('view-list');
      clearTabs(4);

      const viewRows = views.result.items.filter(view => view.eCommerceTracking === true);

      document.getElementById('view-no-data').style.display = viewRows.length === 0
          ? 'block'
          : 'none';

      viewRows.forEach(view => {
        const viewItem = document.createElement('li');
        const viewButton = document.createElement('button');
        viewButton.textContent = `${view.name} (${view.id})`;
        viewButton.setAttribute('data-account-id', accountId);
        viewButton.setAttribute('data-property-id', propertyId);
        viewButton.setAttribute('data-view-id', view.id);
        viewButton.setAttribute('data-view-currency', view.currency);
        viewItem.appendChild(viewButton);
        viewsContainer.appendChild(viewItem);
      });

      document.getElementById('view-tab').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(err => {
      hideLoader();
      showModal(err.details);
    });
}

function selectView (event) {
  if (event.target.tagName !== 'BUTTON') return null;

  const viewId = event.target.getAttribute('data-view-id');
  const currency = event.target.getAttribute('data-view-currency') || 'USD';

  showLoader();
  runReport(viewId, currency, (err, report) => {
    hideLoader();
    console.log('formated-report=', report);

    if (err) {
      return showModal(err.details);
    }

    clearTabs(5);

    writeFirstOfPathReport(report);
    drawChart(
      document.getElementById('first-of-path-chart'),
      `Reported revenue conversion paths with ${beautifyWord(adSource)} at the start`,
      { query: report.query, rows: report.firstOfPathRows }
    );

    writeMiddleOfPathReport(report);
    drawChart(
      document.getElementById('middle-of-path-chart'),
      `Reported revenue conversion paths with ${beautifyWord(adSource)} in the middle`,
      { query: report.query, rows: report.middleOfPathRows }
    );

    writeLastOfPathReport(report);
    drawChart(
      document.getElementById('last-of-path-chart'),
      `Reported revenue conversion paths with ${beautifyWord(adSource)} at the end`,
      { query: report.query, rows: report.lastOfPathRows }
    );

    writeContactSection(report);

    document.getElementById('first-of-path-chart').scrollIntoView({ behavior: 'smooth' });
  });
}

function runReport (viewId, currency, callback) {
  gapi.client.analytics.data.mcf
    .get({
      ids: `ga:${viewId}`,
      'start-date': startDate,
      'end-date': endDate,
      metrics: [
        'mcf:totalConversions',
        'mcf:totalConversionValue'
      ].join(','),
      dimensions: [
        'mcf:sourcePath',
        'mcf:basicChannelGroupingPath',
        'mcf:conversionDate'
      ].join(','),
      filters: [
        `mcf:source=~^(${adSource})$`
      ].join(','),
      sort: [
        '-mcf:totalConversionValue'
      ].join(','),
      samplingLevel: 'HIGHER_PRECISION',
      'include-empty-rows': false
    })
    .then(report => {
      console.log('REPORTS=', report);

      const reportRows = (report.result.rows || []).map(row => {
        row[2].primitiveValue = new Date(
          row[2]
            .primitiveValue
            .split(/^(\d{4})(\d{2})(\d{2})$/)
            .slice(1, -1)
            .join('-')
        ).getTime();
        row[3].primitiveValue = parseInt(row[3].primitiveValue, 10);
        row[4].primitiveValue = parseFloat(row[4].primitiveValue);
        return row;
      });

      window.rr = reportRows;

      const firstOfPathRows = reportRows
        .filter(row => (
          row[0].conversionPathValue.length > 1 &&
          row[0].conversionPathValue[0].nodeValue.toLowerCase() === adSource &&
          row[0].conversionPathValue.filter(path => path.nodeValue.toLowerCase() === adSource).length === 1
        ));

      const middleOfPathRows = reportRows
        .filter(row => (
          row[0].conversionPathValue.length > 1 &&
          row[0].conversionPathValue[0].nodeValue.toLowerCase() !== adSource &&
          row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() !== adSource &&
          (
            row[0].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(adSource) <
            row[1].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(directChannels)
          )
        ));

      const lastOfPathRows = reportRows
        .filter(row => row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() === adSource);

      const totalConversions = reportRows
        .reduce((total, row) => total + row[3].primitiveValue, 0);
      const sampleSize = report.result.containsSampledData === true
        ? report.result.sampleSize
        : totalConversions;
      const sampleSpace = report.result.containsSampledData === true
        ? report.result.sampleSpace
        : totalConversions;
      const sampling = {
        size: sampleSize,
        space: sampleSpace,
        rate: sampleSize / sampleSpace
      };

      const formattedReport = {
        query: {
          startDate: report.result.query['start-date'],
          endDate: report.result.query['end-date'],
          currency
        },
        sampling,
        firstOfPath: firstOfPathRows.reduce((accumulator, row) => (
          accumulator.size += row[3].primitiveValue,
          accumulator.value += row[4].primitiveValue,
          accumulator
        ), { size: 0, value: 0 }),
        firstOfPathRows: firstOfPathRows
          .map(row => [ row[2].primitiveValue, row[4].primitiveValue ])
          .sort((rowA, rowB) => rowA[0] - rowB[0]),
        middleOfPath: middleOfPathRows.reduce((accumulator, row) => (
          accumulator.size += row[3].primitiveValue,
          accumulator.value += row[4].primitiveValue,
          accumulator
        ), { size: 0, value: 0 }),
        middleOfPathRows: middleOfPathRows
          .map(row => [ row[2].primitiveValue, row[4].primitiveValue ])
          .sort((rowA, rowB) => rowA[0] - rowB[0]),
        lastOfPath: lastOfPathRows.reduce((accumulator, row) => (
          accumulator.size += row[3].primitiveValue,
          accumulator.value += row[4].primitiveValue,
          accumulator
        ), { size: 0, value: 0 }),
        lastOfPathRows: lastOfPathRows
          .map(row => [ row[2].primitiveValue, row[4].primitiveValue ])
          .sort((rowA, rowB) => rowA[0] - rowB[0])
      };

      return callback(null, formattedReport);
    })
    .catch(callback);
};

function beautifyInteger (integer) {
  const integerWrapper = document.createElement('strong');
  integerWrapper.innerText = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return integerWrapper.outerHTML;
}

function beautifyFloat (float, unit) {
  const floatWrapper = document.createElement('strong');
  floatWrapper.innerText = float.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (unit === '%' ? unit : (unit ? ' ' + unit : ''));
  return floatWrapper.outerHTML;
}

function beautifyDate (date) {
  const dateWrapper = document.createElement('strong');
  dateWrapper.innerText = new Date(date).toLocaleString('en-us', { day: 'numeric', month: 'long', year: 'numeric' });
  return dateWrapper.outerHTML;
}

function beautifyWord (word) {
  return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
}

function writeFirstOfPathReport (report) {
  document.getElementById('first-of-path-report').innerHTML = `
    Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
    containing a ${beautifyWord(adSource)} retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
    a total of ${beautifyInteger(report.firstOfPath.size)} (${beautifyFloat(report.firstOfPath.size / (report.sampling.size / 100), '%')}) were only attributed in the <strong><u>first step of the path</u></strong>
    for a total amount of ${beautifyFloat(report.firstOfPath.value, report.query.currency)}.
    <br />
    <br />
    Due to the conversion latency being longer than <strong>30 days</strong> or due to multi-device usage, it's possible for remarketing to be used.
    ${beautifyWord(adSource)} will account for these types of conversion paths which are considered to be inefficient!
    <br />
    Your potential savings using our optimisation: ${report.firstOfPath.size / ((report.firstOfPath.size + report.middleOfPath.size + report.lastOfPath.size) / 100)}% of your ${beautifyWord(adSource)} budget!
  `.trim();
}

function writeMiddleOfPathReport (report) {
  document.getElementById('middle-of-path-report').innerHTML = `
    Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
    containing a ${beautifyWord(adSource)} retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
    a total of ${beautifyInteger(report.middleOfPath.size)} (${beautifyFloat(report.middleOfPath.size / (report.sampling.size / 100), '%')}) were only attributed in the <strong><u>intermediate steps of the path</u></strong>
    for a total amount of ${beautifyFloat(report.middleOfPath.value, report.query.currency)}.
    <br />
    <br />
    ${beautifyWord(adSource)} will account for these types of conversion paths which are considered to be inefficient!
    <br />
    Your potential savings using our optimisation: ${report.middleOfPath.size / ((report.firstOfPath.size + report.middleOfPath.size + report.lastOfPath.size) / 100)}% of your ${beautifyWord(adSource)} budget!
  `.trim();
}

function writeLastOfPathReport (report) {
  document.getElementById('last-of-path-report').innerHTML = `
    Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
    containing a ${beautifyWord(adSource)} retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
    a total of ${beautifyInteger(report.lastOfPath.size)} (${beautifyFloat(report.lastOfPath.size / (report.sampling.size / 100), '%')}) were at least attributed once in the <strong><u>last step of the path</u></strong>
    for a total amount of ${beautifyFloat(report.lastOfPath.value, report.query.currency)}.
    <br />
    <br />
    These types of conversion paths are the most optimal due to being the last step before conversion.
  `.trim();
}

function writeContactSection (report) {
  document.getElementById('contact-section').innerHTML = `
    If you want to save ${(report.firstOfPath.size + report.middleOfPath.size) / ((report.firstOfPath.size + report.middleOfPath.size + report.lastOfPath.size) / 100)}%
    on your remarketing budget, please contact us and we will advise you with the necessary steps to start saving.
    <br /><br />
    tel: <a href="tel:+32012345">+32 012 345 678</a>
    <br /><br />
    email: <a href="mailto:test@remarketingsaver.com">test@remarketingsaver.com</a>
  `.trim();
}

function drawChart (chartContainer, title, report) {
  const query = report.query;
  const rows = report.rows;
  Highcharts.chart(chartContainer, {
    credits: {
      enabled: false
    },
    chart: {
      zoomType: 'x',
      backgroundColor: 'transparent'
    },
    title: {
      text: title,
      style: {
        color: 'white',
        font: 'bold 24px "Poppins", sans-serif'
      }
    },
    subtitle: {
      text: document.ontouchstart === undefined ?
        'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
    },
    xAxis: {
      type: 'datetime',
      lineColor: 'white',
      lineWidth: 1,
      tickColor: 'white',
      labels: {
         style: {
            color: 'white',
            font: '12px "Poppins", sans-serif'
         }
      }
    },
    yAxis: {
      min: 0,
      gridLineWidth: 0,
      lineColor: 'white',
      lineWidth: 1,
      title: {
        text: `Total conversion value in ${query.currency}`,
        style: {
          color: 'white',
          font: '16px "Poppins", sans-serif'
        }
      },
      labels: {
         style: {
            color: 'white',
            font: '12px "Poppins", sans-serif'
         }
      }
    },
    legend: {
      enabled: false
    },
    plotOptions: {
      area: {
        fillColor: {
          linearGradient: {
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 1
          },
          stops: [
            [0, '#4F52D4'],
            [1, Highcharts.Color('#4F52D4').setOpacity(0).get('rgba')]
          ]
        },
        marker: {
          radius: 2
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1
          }
        },
        threshold: null
      }
    },
    series: [{
      type: 'area',
      name: `value in ${query.currency}`,
      data: rows
    }]
  });
}

function initClient () {
  if (window.hasOwnProperty('gapi') === false) {
    return showModal('You are using an ad-blocker which is interfering with the Google Analytics API used by this application. Please disable it and try again.');
  }

  const adBlockerTimer = setTimeout(() => {
    showModal('You are using an ad-blocker which is interfering with the Google Analytics API used by this application. Please disable it and try again.');
  }, 1000 * 30);
  showLoader();
  gapi.client.init({
    'clientId': '117859912987-fljbv2m0oqo1qje2prd2mtd6hiipb8s3.apps.googleusercontent.com',
    'apiKey': 'AIzaSyCwJ5EtOqMF8mNx49iBS7Axd6ycVe9PbF0',
    'discoveryDocs': [
      'https://www.googleapis.com/discovery/v1/apis/analytics/v3/rest'
    ],
    'scope': [
      'email',
      'openid',
      'profile',
      'https://www.googleapis.com/auth/analytics.readonly'
    ].join(' ')
  })
    .then(() => {
      clearTimeout(adBlockerTimer);
      hideLoader();
      document.getElementById('sign-in-button').onclick = signIn;
      document.getElementById('account-list').onclick = selectAccount;
      document.getElementById('property-list').onclick = selectProperty;
      document.getElementById('view-list').onclick = selectView;
    })
    .catch((err) => {
      clearTimeout(adBlockerTimer);
      hideLoader();
      showModal(err.details);
    });
}
