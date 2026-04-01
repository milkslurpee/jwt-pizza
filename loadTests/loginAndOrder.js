import { sleep, check, group, fail } from 'k6'
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Scenario_1: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 7, duration: '1m' },
        { target: 3, duration: '3m30s' },
        { target: 0, duration: '1m' },
      ],
      gracefulRampDown: '30s',
      exec: 'scenario_1',
    },
  },
}

export function scenario_1() {
  let response
  const vars = {}

  group('page_1 - http://pizza.mrpizzajohn.com/', function () {

    // Login
    response = http.put(
      'https://pizza-service.mrpizzajohn.com/api/auth',
      '{"email":"a@jwt.com","password":"admin"}',
      {
        headers: {
          accept: '*/*',
          'content-type': 'application/json',
          origin: 'https://pizza.mrpizzajohn.com',
        },
      }
    )
    if (!check(response, { 'login status equals 200': r => r.status === 200 })) {
      console.log(response.body)
      fail('Login failed - not 200')
    }
    vars['token'] = jsonpath.query(response.json(), '$.token')[0]
    sleep(8.8)

    // Get menu
    response = http.get('https://pizza-service.mrpizzajohn.com/api/order/menu', {
      headers: {
        accept: '*/*',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.mrpizzajohn.com',
      },
    })
    sleep(13.5)

    // Get franchise
    response = http.get(
      'https://pizza-service.mrpizzajohn.com/api/franchise?page=0&limit=20&name=*',
      {
        headers: {
          accept: '*/*',
          authorization: `Bearer ${vars['token']}`,
          'content-type': 'application/json',
          origin: 'https://pizza.mrpizzajohn.com',
        },
      }
    )

    // Get user
    response = http.get('https://pizza-service.mrpizzajohn.com/api/user/me', {
      headers: {
        accept: '*/*',
        authorization: `Bearer ${vars['token']}`,
        'content-type': 'application/json',
        origin: 'https://pizza.mrpizzajohn.com',
      },
    })
    sleep(6.4)

    // Order pizza
    response = http.post(
      'https://pizza-service.mrpizzajohn.com/api/order',
      '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"1","franchiseId":1}',
      {
        headers: {
          accept: '*/*',
          authorization: `Bearer ${vars['token']}`,
          'content-type': 'application/json',
          origin: 'https://pizza.mrpizzajohn.com',
        },
      }
    )
    if (!check(response, { 'order status equals 200': r => r.status === 200 })) {
      console.log(response.body)
      fail('Order failed - not 200')
    }
    vars['pizzaJwt'] = jsonpath.query(response.json(), '$.jwt')[0]

    // Verify pizza JWT
    response = http.post(
      'https://pizza-factory.cs329.click/api/order/verify',
      JSON.stringify({ jwt: vars['pizzaJwt'] }),
      {
        headers: {
          accept: '*/*',
          authorization: `Bearer ${vars['token']}`,
          'content-type': 'application/json',
          origin: 'https://pizza.mrpizzajohn.com',
        },
      }
    )
    check(response, { 'verify status equals 200': r => r.status === 200 })
  })
}