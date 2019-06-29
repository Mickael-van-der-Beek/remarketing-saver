'use strict';

function drawChart (chartContainer, title, { query, rows }) {
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
      name: 'USD to EUR',
      data: rows
    }]
  });
}
