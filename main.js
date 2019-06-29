'use strict';

async function initClient () {
  await gapi.client.init({
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
  });

  const query = window.location.search
    .slice(1)
    .split('&')
    .map(param => param.split('='))
    .reduce((query, [ key, value ]) => (
      query.set(key, value),
      query
    ), new Map())
  const adSource = query.get('adSource') || 'criteo';
  const directChannels = (query.get('directChannels') || 'direct'); // .split(',');
  clearTabs(1);

  function clearTabs (tabIndex) {
    if (tabIndex < 2) {
      document.getElementById('account-tab').style.display = 'none';
      const accountsContainer = document.getElementById('account-list');
      while (accountsContainer.firstChild) {
        accountsContainer.removeChild(accountsContainer.firstChild);
      }
    }
    if (tabIndex < 3) {
      document.getElementById('property-tab').style.display = 'none';
      const propertiesContainer = document.getElementById('property-list');
      while (propertiesContainer.firstChild) {
        propertiesContainer.removeChild(propertiesContainer.firstChild);
      }
    }
    if (tabIndex < 4) {
      document.getElementById('view-tab').style.display = 'none';
      const viewsContainer = document.getElementById('view-list');
      while (viewsContainer.firstChild) {
        viewsContainer.removeChild(viewsContainer.firstChild);
      }
    }
    // if (tabIndex < 5) {
    //   document.getElementById('first-of-path-tab').style.display = 'none';
    //   document.getElementById('middle-of-path-tab').style.display = 'none';
    //   document.getElementById('last-of-path-tab').style.display = 'none';
    //   document.getElementById('footer-tab').style.display = 'none';
    // }
  }

  async function signIn () {
    const user = await gapi.auth2.getAuthInstance().signIn();

    const accounts = await gapi.client.analytics.management.accounts.list();

    console.log('accounts=', accounts);

    const accountsContainer = document.getElementById('account-list');
    clearTabs(1);

    accounts.result.items.forEach(account => {
      const accountItem = document.createElement('li');
      const accountButton = document.createElement('button');
      accountButton.textContent = `${account.name} (${account.id})`;
      accountButton.setAttribute('data-account-id', account.id);
      accountItem.appendChild(accountButton);
      accountsContainer.appendChild(accountItem);
    });

    document.getElementById('account-tab').scrollIntoView();
  }
  document.getElementById('sign-in-button').onclick = signIn;

  async function selectAccount (event) {
    const accountId = event.target.getAttribute('data-account-id');

    const properties = await gapi.client.analytics.management.webproperties.list({
      accountId
    });

    console.log('properties=', properties);

    const propertiesContainer = document.getElementById('property-list');
    clearTabs(2);

    properties.result.items.forEach(property => {
      const propertyItem = document.createElement('li');
      const propertyButton = document.createElement('button');
      propertyButton.textContent = `${property.name} (${property.id})`;
      propertyButton.setAttribute('data-account-id', accountId);
      propertyButton.setAttribute('data-property-id', property.id);
      propertyItem.appendChild(propertyButton);
      propertiesContainer.appendChild(propertyItem);
    });

    document.getElementById('property-tab').scrollIntoView();
  }
  document.getElementById('account-list').onclick = selectAccount;

  async function selectProperty (event) {
    const accountId = event.target.getAttribute('data-account-id');
    const propertyId = event.target.getAttribute('data-property-id');

    const views = await gapi.client.analytics.management.profiles.list({
      accountId,
      webPropertyId: propertyId
    });

    console.log('views=', views);

    const viewsContainer = document.getElementById('view-list');
    clearTabs(3);

    views.result.items.forEach(view => {
      const viewItem = document.createElement('li');
      const viewButton = document.createElement('button');
      viewButton.textContent = `${view.name} (${view.id})`;
      viewButton.setAttribute('data-account-id', accountId);
      viewButton.setAttribute('data-property-id', propertyId);
      viewButton.setAttribute('data-view-id', view.id);
      viewItem.appendChild(viewButton);
      viewsContainer.appendChild(viewItem);
    });

    document.getElementById('view-tab').scrollIntoView();
  }
  document.getElementById('property-list').onclick = selectProperty;

  async function selectView (event) {
    const viewId = event.target.getAttribute('data-view-id');

    await runReport(viewId);
  }
  document.getElementById('view-list').onclick = selectView;

  // async function runReport (viewId) {
  function runReport (report) {
    // const report = await gapi.client.analytics.data.mcf.get({
    //   ids: `ga:${viewId}`,
    //   'start-date': '2017-01-01',
    //   'end-date': '2019-05-01',
    //   metrics: [
    //     'mcf:totalConversions',
    //     'mcf:totalConversionValue'
    //   ].join(','),
    //   dimensions: [
    //     'mcf:sourcePath',
    //     'mcf:basicChannelGroupingPath',
    //     'mcf:conversionDate'
    //   ].join(','),
    //   filters: [
    //     `mcf:source=~^(${adSource})$`
    //   ].join(','),
    //   sort: [
    //     '-mcf:totalConversionValue'
    //   ].join(','),
    //   samplingLevel: 'HIGHER_PRECISION',
    //   'include-empty-rows': false
    // });

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

    const firstOfPathRows = reportRows
      .filter(row => (
        row[0].conversionPathValue[0].nodeValue.toLowerCase() === adSource &&
        row[0].conversionPathValue.filter(path => path.nodeValue.toLowerCase() === adSource).length === 1
      ));

    const middleOfPathRows = reportRows
      .filter(row => (
        row[0].conversionPathValue[0].nodeValue.toLowerCase() !== adSource &&
        row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() !== adSource &&
        (
          row[0].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(adSource) <
          row[1].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(directChannels)
        )
      ));

    const lastOfPathRows = reportRows
      .filter(row => (
        row[0].conversionPathValue.length > 1 &&
        row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() === adSource &&
        row[0].conversionPathValue.filter(path => path.nodeValue.toLowerCase() === adSource).length === 1
      ));

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
        currency: '$'
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
    console.log('formattedReport=', formattedReport);

    return formattedReport;
  };

  function beautifyInteger (integer, unit) {
    const integerWrapper = document.createElement('strong');
    integerWrapper.innerText = integer.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (unit || '');
    return integerWrapper.outerHTML;
  }

  function beautifyFloat (float, unit) {
    const floatWrapper = document.createElement('strong');
    floatWrapper.innerText = float.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (unit || '');
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
      a total of ${beautifyInteger(report.firstOfPath.size)} (${beautifyFloat(report.firstOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the <strong><u>first step in the path</u></strong>
      for a total amount of ${beautifyFloat(report.firstOfPath.value, report.query.currency)}.
      <br />
      <br />
      This can be due to the conversion latency being longer than <strong>30 days</strong> or due to multi-device usage.
    `.trim();
  }

  function writeMiddleOfPathReport (report) {
    document.getElementById('middle-of-path-report').innerHTML = `
      Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
      containing a ${beautifyWord(adSource)} retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
      a total of ${beautifyInteger(report.middleOfPath.size)} (${beautifyFloat(report.middleOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the <strong><u>intermediate step in the path</u></strong>
      for a total amount of ${beautifyFloat(report.middleOfPath.value, report.query.currency)}.
      <br />
      <br />
      This is due to the conversion latency being longer than <strong>30 days</strong>.
    `.trim();
  }

  function writeLastOfPathReport (report) {
    document.getElementById('last-of-path-report').innerHTML = `
      Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
      containing a ${beautifyWord(adSource)} retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
      a total of ${beautifyInteger(report.lastOfPath.size)} (${beautifyFloat(report.lastOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the <strong><u>last step in the path</u></strong>
      for a total amount of ${beautifyInteger(report.lastOfPath.value, report.query.currency)}.
      <br />
      <br />
      This is due to the conversion latency being longer than <strong>30 days</strong>.
    `.trim();
  }

  const data = JSON.parse('{"result":{"kind":"analytics#mcfData","id":"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01","query":{"start-date":"2017-01-01","end-date":"2019-05-01","ids":"ga:171071252","dimensions":"mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate","metrics":["mcf:totalConversions","mcf:totalConversionValue"],"sort":["-mcf:totalConversionValue"],"filters":"mcf:source=~^(google)$","start-index":1,"max-results":1000,"samplingLevel":"HIGHER_PRECISION"},"itemsPerPage":1000,"totalResults":14,"selfLink":"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01","profileInfo":{"profileId":"171071252","accountId":"57069990","webPropertyId":"UA-57069990-1","internalWebPropertyId":"90699526","profileName":"Application","tableId":"mcf:171071252"},"containsSampledData":false,"columnHeaders":[{"name":"mcf:sourcePath","columnType":"DIMENSION","dataType":"MCF_SEQUENCE"},{"name":"mcf:basicChannelGroupingPath","columnType":"DIMENSION","dataType":"MCF_SEQUENCE"},{"name":"mcf:conversionDate","columnType":"DIMENSION","dataType":"STRING"},{"name":"mcf:totalConversions","columnType":"METRIC","dataType":"INTEGER"},{"name":"mcf:totalConversionValue","columnType":"METRIC","dataType":"CURRENCY"}],"totalsForAllResults":{"mcf:totalConversions":"14","mcf:totalConversionValue":"3275.474694"},"rows":[[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181113"},{"primitiveValue":"1"},{"primitiveValue":"602.814"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20180903"},{"primitiveValue":"1"},{"primitiveValue":"418.260194"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181008"},{"primitiveValue":"1"},{"primitiveValue":"345.489774"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"social"},{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"(unavailable)"},{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181007"},{"primitiveValue":"1"},{"primitiveValue":"345.489774"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20190328"},{"primitiveValue":"1"},{"primitiveValue":"337.770701"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181021"},{"primitiveValue":"1"},{"primitiveValue":"300.0"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181128"},{"primitiveValue":"1"},{"primitiveValue":"300.0"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20190226"},{"primitiveValue":"1"},{"primitiveValue":"129.884285"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181116"},{"primitiveValue":"1"},{"primitiveValue":"119.88"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20180919"},{"primitiveValue":"1"},{"primitiveValue":"119.88"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"interactionType":"CLICK","nodeValue":"couponbirds.com"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"interactionType":"CLICK","nodeValue":"Referral"}]},{"primitiveValue":"20181119"},{"primitiveValue":"1"},{"primitiveValue":"68.364005"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181114"},{"primitiveValue":"1"},{"primitiveValue":"67.641961"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181115"},{"primitiveValue":"1"},{"primitiveValue":"60.0"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20190102"},{"primitiveValue":"1"},{"primitiveValue":"60.0"}]]},"body":"{\\"kind\\":\\"analytics#mcfData\\",\\"id\\":\\"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01\\",\\"query\\":{\\"start-date\\":\\"2017-01-01\\",\\"end-date\\":\\"2019-05-01\\",\\"ids\\":\\"ga:171071252\\",\\"dimensions\\":\\"mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate\\",\\"metrics\\":[\\"mcf:totalConversions\\",\\"mcf:totalConversionValue\\"],\\"sort\\":[\\"-mcf:totalConversionValue\\"],\\"filters\\":\\"mcf:source=~^(google)$\\",\\"start-index\\":1,\\"max-results\\":1000,\\"samplingLevel\\":\\"HIGHER_PRECISION\\"},\\"itemsPerPage\\":1000,\\"totalResults\\":14,\\"selfLink\\":\\"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01\\",\\"profileInfo\\":{\\"profileId\\":\\"171071252\\",\\"accountId\\":\\"57069990\\",\\"webPropertyId\\":\\"UA-57069990-1\\",\\"internalWebPropertyId\\":\\"90699526\\",\\"profileName\\":\\"Application\\",\\"tableId\\":\\"mcf:171071252\\"},\\"containsSampledData\\":false,\\"columnHeaders\\":[{\\"name\\":\\"mcf:sourcePath\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"MCF_SEQUENCE\\"},{\\"name\\":\\"mcf:basicChannelGroupingPath\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"MCF_SEQUENCE\\"},{\\"name\\":\\"mcf:conversionDate\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"STRING\\"},{\\"name\\":\\"mcf:totalConversions\\",\\"columnType\\":\\"METRIC\\",\\"dataType\\":\\"INTEGER\\"},{\\"name\\":\\"mcf:totalConversionValue\\",\\"columnType\\":\\"METRIC\\",\\"dataType\\":\\"CURRENCY\\"}],\\"totalsForAllResults\\":{\\"mcf:totalConversions\\":\\"14\\",\\"mcf:totalConversionValue\\":\\"3275.474694\\"},\\"rows\\":[[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181113\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"602.814\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20180903\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"418.260194\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181008\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"345.489774\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"social\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"(unavailable)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181007\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"345.489774\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20190328\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"337.770701\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181021\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"300.0\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181128\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"300.0\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20190226\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"129.884285\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181116\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"119.88\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20180919\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"119.88\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"couponbirds.com\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Referral\\"}]},{\\"primitiveValue\\":\\"20181119\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"68.364005\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181114\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"67.641961\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181115\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"60.0\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20190102\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"60.0\\"}]]}","headers":{"date":"Sun, 26 May 2019 17:08:27 GMT","content-encoding":"gzip","server":"GSE","etag":"\\"IMq2Alc57Z_qnZB2Hoh_dLGYlaI/yY7XR73_zi5d6dVsK-u1ojdulQ4\\"","content-type":"application/json; charset=UTF-8","vary":"Origin, X-Origin","cache-control":"private, max-age=0, must-revalidate, no-transform","content-length":"1036","expires":"Sun, 26 May 2019 17:08:27 GMT"},"status":200,"statusText":null}');
  const report = runReport(data);

  writeFirstOfPathReport(report);
  writeMiddleOfPathReport(report);
  writeLastOfPathReport(report);
  drawFirsOfPathChart(
    document.getElementById('first-of-path-chart'),
    { query: report.query, rows: report.firstOfPathRows }
  );
  drawFirsOfPathChart(
    document.getElementById('middle-of-path-chart'),
    { query: report.query, rows: report.middleOfPathRows }
  );
  drawFirsOfPathChart(
    document.getElementById('last-of-path-chart'),
    { query: report.query, rows: report.lastOfPathRows }
  );
}
