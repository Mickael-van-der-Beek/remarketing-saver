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

  function clearTabs (tabIndex) {
    if (tabIndex < 1) {
      const accountsContainer = document.getElementById('account-list');
      while (accountsContainer.firstChild) {
        accountsContainer.removeChild(accountsContainer.firstChild);
      }
    }
    if (tabIndex < 2) {
      const propertiesContainer = document.getElementById('property-list');
      while (propertiesContainer.firstChild) {
        propertiesContainer.removeChild(propertiesContainer.firstChild);
      }
    }
    if (tabIndex < 3) {
      const viewsContainer = document.getElementById('view-list');
      while (viewsContainer.firstChild) {
        viewsContainer.removeChild(viewsContainer.firstChild);
      }
    }
  }

  async function signIn () {
    const user = await gapi.auth2.getAuthInstance().signIn();

    const accounts = await gapi.client.analytics.management.accounts.list();

    const accountsContainer = document.getElementById('account-list');
    clearTabs(0);

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

    const propertiesContainer = document.getElementById('property-list');
    clearTabs(1);

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

    const viewsContainer = document.getElementById('view-list');
    clearTabs(2);

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

  async function runReport (viewId) {
    const sourceAd = 'google';
    const channelDirect = 'direct';

    const report = await gapi.client.analytics.data.mcf.get({
      ids: `ga:${viewId}`,
      'start-date': '2017-01-01',
      'end-date': '2019-05-01',
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
        `mcf:source=~^(${sourceAd})$`
      ].join(','),
      sort: [
        '-mcf:totalConversionValue'
      ].join(','),
      samplingLevel: 'HIGHER_PRECISION',
      'include-empty-rows': false
    });

    console.log('REPORTS=', report);

    const firstOfPathReport = (report.result.rows || [])
      .filter(row => (
        row[0].conversionPathValue[0].nodeValue.toLowerCase() === sourceAd &&
        row[0].conversionPathValue.filter(path => path.nodeValue.toLowerCase() === sourceAd).length === 1
      ));

    const middleOfPathReport = (report.result.rows || [])
      .filter(row => (
        row[0].conversionPathValue[0].nodeValue.toLowerCase() !== sourceAd &&
        row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() !== sourceAd &&
        (
          row[0].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(sourceAd) <
          row[1].conversionPathValue.map(path => path.nodeValue.toLowerCase()).lastIndexOf(channelDirect)
        )
      ));

    const lastOfPathReport = (report.result.rows || [])
      .filter(row => (
        row[0].conversionPathValue.length > 1 &&
        row[0].conversionPathValue[row[0].conversionPathValue.length - 1].nodeValue.toLowerCase() === sourceAd &&
        row[0].conversionPathValue.filter(path => path.nodeValue.toLowerCase() === sourceAd).length === 1
      ));

    const totalConversions = (report.result.rows || [])
      .map(row => parseInt(row[3].primitiveValue, 10))
      .reduce((total, size) => total + size, 0);
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
      firstOfPath: firstOfPathReport
        .map(row => ({
          count: parseInt(row[3].primitiveValue, 10),
          value: parseFloat(row[4].primitiveValue)
        }))
        .reduce((accumulator, { count, value }) => (
          accumulator.size += count,
          accumulator.value += value,
          accumulator
        ), { size: 0, value: 0 }),
      middleOfPath: middleOfPathReport
        .map(row => ({
          count: parseInt(row[3].primitiveValue, 10),
          value: parseFloat(row[4].primitiveValue)
        }))
        .reduce((accumulator, { count, value }) => (
          accumulator.size += count,
          accumulator.value += value,
          accumulator
        ), { size: 0, value: 0 }),
      lastOfPath: lastOfPathReport
        .map(row => ({
          count: parseInt(row[3].primitiveValue, 10),
          value: parseFloat(row[4].primitiveValue)
        }))
        .reduce((accumulator, { count, value }) => (
          accumulator.size += count,
          accumulator.value += value,
          accumulator
        ), { size: 0, value: 0 })
    };
    console.log('formattedReport=', formattedReport);

    writeFirstOfPathReport(formattedReport);
    writeMiddleOfPathReport(formattedReport);
    writeLastOfPathReport(formattedReport);

    return formattedReport;
  };

  // const data = JSON.parse('{"result":{"kind":"analytics#mcfData","id":"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01","query":{"start-date":"2017-01-01","end-date":"2019-05-01","ids":"ga:171071252","dimensions":"mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate","metrics":["mcf:totalConversions","mcf:totalConversionValue"],"sort":["-mcf:totalConversionValue"],"filters":"mcf:source=~^(google)$","start-index":1,"max-results":1000,"samplingLevel":"HIGHER_PRECISION"},"itemsPerPage":1000,"totalResults":14,"selfLink":"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01","profileInfo":{"profileId":"171071252","accountId":"57069990","webPropertyId":"UA-57069990-1","internalWebPropertyId":"90699526","profileName":"Application","tableId":"mcf:171071252"},"containsSampledData":false,"columnHeaders":[{"name":"mcf:sourcePath","columnType":"DIMENSION","dataType":"MCF_SEQUENCE"},{"name":"mcf:basicChannelGroupingPath","columnType":"DIMENSION","dataType":"MCF_SEQUENCE"},{"name":"mcf:conversionDate","columnType":"DIMENSION","dataType":"STRING"},{"name":"mcf:totalConversions","columnType":"METRIC","dataType":"INTEGER"},{"name":"mcf:totalConversionValue","columnType":"METRIC","dataType":"CURRENCY"}],"totalsForAllResults":{"mcf:totalConversions":"14","mcf:totalConversionValue":"3275.474694"},"rows":[[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181113"},{"primitiveValue":"1"},{"primitiveValue":"602.814"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20180903"},{"primitiveValue":"1"},{"primitiveValue":"418.260194"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181008"},{"primitiveValue":"1"},{"primitiveValue":"345.489774"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"social"},{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"(unavailable)"},{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181007"},{"primitiveValue":"1"},{"primitiveValue":"345.489774"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20190328"},{"primitiveValue":"1"},{"primitiveValue":"337.770701"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181021"},{"primitiveValue":"1"},{"primitiveValue":"300.0"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181128"},{"primitiveValue":"1"},{"primitiveValue":"300.0"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20190226"},{"primitiveValue":"1"},{"primitiveValue":"129.884285"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"}]},{"primitiveValue":"20181116"},{"primitiveValue":"1"},{"primitiveValue":"119.88"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20180919"},{"primitiveValue":"1"},{"primitiveValue":"119.88"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"},{"interactionType":"CLICK","nodeValue":"couponbirds.com"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"},{"interactionType":"CLICK","nodeValue":"Referral"}]},{"primitiveValue":"20181119"},{"primitiveValue":"1"},{"primitiveValue":"68.364005"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181114"},{"primitiveValue":"1"},{"primitiveValue":"67.641961"}],[{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20181115"},{"primitiveValue":"1"},{"primitiveValue":"60.0"}],[{"conversionPathValue":[{"nodeValue":"(direct)"},{"nodeValue":"(direct)"},{"interactionType":"CLICK","nodeValue":"google"}]},{"conversionPathValue":[{"nodeValue":"Direct"},{"nodeValue":"Direct"},{"interactionType":"CLICK","nodeValue":"Organic Search"}]},{"primitiveValue":"20190102"},{"primitiveValue":"1"},{"primitiveValue":"60.0"}]]},"body":"{\\"kind\\":\\"analytics#mcfData\\",\\"id\\":\\"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01\\",\\"query\\":{\\"start-date\\":\\"2017-01-01\\",\\"end-date\\":\\"2019-05-01\\",\\"ids\\":\\"ga:171071252\\",\\"dimensions\\":\\"mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate\\",\\"metrics\\":[\\"mcf:totalConversions\\",\\"mcf:totalConversionValue\\"],\\"sort\\":[\\"-mcf:totalConversionValue\\"],\\"filters\\":\\"mcf:source=~^(google)$\\",\\"start-index\\":1,\\"max-results\\":1000,\\"samplingLevel\\":\\"HIGHER_PRECISION\\"},\\"itemsPerPage\\":1000,\\"totalResults\\":14,\\"selfLink\\":\\"https://www.googleapis.com/analytics/v3/data/mcf?ids=ga:171071252&dimensions=mcf:sourcePath,mcf:basicChannelGroupingPath,mcf:conversionDate&metrics=mcf:totalConversions,mcf:totalConversionValue&sort=-mcf:totalConversionValue&filters=mcf:source%3D~%5E(google)$&start-date=2017-01-01&end-date=2019-05-01\\",\\"profileInfo\\":{\\"profileId\\":\\"171071252\\",\\"accountId\\":\\"57069990\\",\\"webPropertyId\\":\\"UA-57069990-1\\",\\"internalWebPropertyId\\":\\"90699526\\",\\"profileName\\":\\"Application\\",\\"tableId\\":\\"mcf:171071252\\"},\\"containsSampledData\\":false,\\"columnHeaders\\":[{\\"name\\":\\"mcf:sourcePath\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"MCF_SEQUENCE\\"},{\\"name\\":\\"mcf:basicChannelGroupingPath\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"MCF_SEQUENCE\\"},{\\"name\\":\\"mcf:conversionDate\\",\\"columnType\\":\\"DIMENSION\\",\\"dataType\\":\\"STRING\\"},{\\"name\\":\\"mcf:totalConversions\\",\\"columnType\\":\\"METRIC\\",\\"dataType\\":\\"INTEGER\\"},{\\"name\\":\\"mcf:totalConversionValue\\",\\"columnType\\":\\"METRIC\\",\\"dataType\\":\\"CURRENCY\\"}],\\"totalsForAllResults\\":{\\"mcf:totalConversions\\":\\"14\\",\\"mcf:totalConversionValue\\":\\"3275.474694\\"},\\"rows\\":[[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181113\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"602.814\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20180903\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"418.260194\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181008\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"345.489774\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"social\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"(unavailable)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181007\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"345.489774\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20190328\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"337.770701\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181021\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"300.0\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181128\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"300.0\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20190226\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"129.884285\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"}]},{\\"primitiveValue\\":\\"20181116\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"119.88\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20180919\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"119.88\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"couponbirds.com\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Referral\\"}]},{\\"primitiveValue\\":\\"20181119\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"68.364005\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181114\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"67.641961\\"}],[{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20181115\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"60.0\\"}],[{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"(direct)\\"},{\\"nodeValue\\":\\"(direct)\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"google\\"}]},{\\"conversionPathValue\\":[{\\"nodeValue\\":\\"Direct\\"},{\\"nodeValue\\":\\"Direct\\"},{\\"interactionType\\":\\"CLICK\\",\\"nodeValue\\":\\"Organic Search\\"}]},{\\"primitiveValue\\":\\"20190102\\"},{\\"primitiveValue\\":\\"1\\"},{\\"primitiveValue\\":\\"60.0\\"}]]}","headers":{"date":"Sun, 26 May 2019 17:08:27 GMT","content-encoding":"gzip","server":"GSE","etag":"\\"IMq2Alc57Z_qnZB2Hoh_dLGYlaI/yY7XR73_zi5d6dVsK-u1ojdulQ4\\"","content-type":"application/json; charset=UTF-8","vary":"Origin, X-Origin","cache-control":"private, max-age=0, must-revalidate, no-transform","content-length":"1036","expires":"Sun, 26 May 2019 17:08:27 GMT"},"status":200,"statusText":null}');

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

  function writeFirstOfPathReport (report) {
    document.getElementById('first-of-path-report').innerHTML = `
      Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
      containing a Criteo retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
      a total of ${beautifyInteger(report.firstOfPath.size)} (${beautifyFloat(report.firstOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the first step in the path
      for a total amount of ${beautifyFloat(report.firstOfPath.value, report.query.currency)}.
      <br />
      <br />
      This can be due to the conversion latency being longer than <strong>30 days</strong> or due to multi-device usage.
    `.trim();
  }

  function writeMiddleOfPathReport (report) {
    document.getElementById('middle-of-path-report').innerHTML = `
      Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
      containing a Criteo retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
      a total of ${beautifyInteger(report.middleOfPath.size)} (${beautifyFloat(report.middleOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the intermediate step in the path
      for a total amount of ${beautifyFloat(report.middleOfPath.value, report.query.currency)}.
      <br />
      <br />
      This is due to the conversion latency being longer than <strong>30 days</strong>.
    `.trim();
  }

  function writeLastOfPathReport (report) {
    document.getElementById('last-of-path-report').innerHTML = `
      Based on a sample of ${beautifyInteger(report.sampling.size)} transactions (${beautifyFloat(report.sampling.rate * 100, '%')} sample rate)
      containing a Criteo retargeting ad in the customer's conversion path between ${beautifyDate(report.query.startDate)} and ${beautifyDate(report.query.endDate)},
      a total of ${beautifyInteger(report.lastOfPath.size)} (${beautifyFloat(report.lastOfPath.size / (report.sampling.size / 100), '%')}) were attributed as the last step in the path
      for a total amount of ${beautifyInteger(report.lastOfPath.value, report.query.currency)}.
      <br />
      <br />
      This is due to the conversion latency being longer than <strong>30 days</strong>.
    `.trim();
  }

  function drawFirsOfPathChart (chart, report) {
    const data = [
      ['A', .08167],
      ['B', .01492],
      ['C', .02782],
      ['D', .04253],
      ['E', .12702],
      ['F', .02288],
      ['G', .02015],
      ['H', .06094],
      ['I', .06966],
      ['J', .00153],
      ['K', .00772],
      ['L', .04025],
      ['M', .02406],
      ['N', .06749],
      ['O', .07507],
      ['P', .01929],
      ['Q', .00095],
      ['R', .05987],
      ['S', .06327],
      ['T', .09056],
      ['U', .02758],
      ['V', .00978],
      ['W', .02360],
      ['X', .00150],
      ['Y', .01974],
      ['Z', .00074]
    ].map(([ letter, frequency ]) => ({ letter, frequency }));

    const svgHeight = chart.parentNode.offsetHeight;
    const svgWidth = chart.parentNode.offsetWidth;

    const svg = d3.select(chart);

    const margin = { top: 50, right: 20, bottom: 50, left: 20 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const x = d3.scaleBand().rangeRound([ 0, width ]).padding(0.1);
    const y = d3.scaleLinear().rangeRound([ height, 0 ]);

    x.domain(data.map(d => d.letter));
    y.domain([ 0, d3.max(data, d => d.frequency) ]);

    const g = svg
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    g
      .append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
      .append('text')
        .attr('transform', `translate(${width / 2},${margin.top - 20})`)
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .text('Day of conversion');

    g
      .append('g')
        .attr('class', 'axis axis--y')
        // .call(d3.axisLeft(y).ticks(10, '%'))
        .call(d3.axisLeft(y))
      // .append('text')
      //   .attr('transform', 'rotate(-90)')
      //   .attr('y', 0 - margin.left - 2)
      //   .attr('x', 0 - (height / 2))
      //   .attr('dy', '1em')
      //   .attr('text-anchor', 'middle')
      //   .attr('fill', 'white')
      //   .text(`Amount in ${report.query.currency}`);

    g
      .selectAll('.bar')
        .data(data)
        .enter()
      .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.letter))
        .attr('y', d => y(d.frequency))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.frequency));
  }

  const report = {
    sampling: {
      rate: 0.85,
      size: 12544
    },
    query: {
      'start-date': '2017-02-01',
      'end-date': '2019-02-01',
      currency: '$'
    },
    firstOfPath: {
      size: 440,
      value: 3351
    },
    middleOfPath: {
      size: 550,
      value: 2262
    },
    lastOfPath: {
      size: 660,
      value: 7798
    }
  };
  writeFirstOfPathReport(report);
  writeMiddleOfPathReport(report);
  writeLastOfPathReport(report);
  drawFirsOfPathChart(document.getElementById('first-of-path-chart'), report);
  drawFirsOfPathChart(document.getElementById('middle-of-path-chart'), report);
  drawFirsOfPathChart(document.getElementById('last-of-path-chart'), report);
}
