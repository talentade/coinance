const express       = require("express");
const bodyParser    = require("body-parser");
const compression   = require("compression");
const json          = require('json');
const md5           = require('md5');
const axios         = require("axios");
const uuid          = require("uuid");
const cors          = require("cors");
const fs            = require("fs");
const q             = express();
const server        = require("http").createServer(q);

let port            = process.env.PORT || 4000;

let fetchBTC = async (url, cb = () => {}, amt) => {
  let urls = {
    binance: 'https://api.binance.com/api/v3/depth?symbol=BTCUSDT',
    coinbase: 'https://api-public.sandbox.exchange.coinbase.com/products/BTC-USD/book?level=3'
  };
  
  // console.log(urls[url]);

  await axios.get(urls[url]).then(resp => {
    let { asks, bids } = resp.data;
    let price = 0, qty = amt, row = 0;

    for(var i = 0; i < asks.length; i++) {
      let row_qty = parseFloat(asks[i][1]);
      let row_price = parseFloat(asks[i][0]);
      
      if(price == 0 && qty >= row_qty) {
        row = i;
        price = row_price;
      } else if(price > 0 && qty >= row_qty) {
        if(row_price < price) {
          row = i;
          price = row_price;
        }
      }
    }

    cb(asks[row]);
  });
}

// bodyParser
q.use(bodyParser.json());
q.use(bodyParser.urlencoded({ extended: false }));

//CORS
q.use(cors());
q.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// compression
q.use(compression())

q.get("/", (req, res) => {
  res.send("Welcome");
});

q.get("/exchange-routing", async (req, res) => {
  let amt = parseFloat(req.query?.amount || 1);
  await fetchBTC("coinbase", async (r1) => {
    await fetchBTC("binance", async (r2) => {
      res.status(200);
      if(r1[0] < r2[0]) {
        res.json({
          "btcAmount": amt,
          "usdAmount": r1[0],
          "exchange": "coinbase"
        });
      } else {
        res.json({
          "btcAmount": amt,
          "usdAmount": r2[0],
          "exchange": "binance"
        });
      }
    }, amt);
  }, amt);
  res.status(400);
});

server.listen(port, () => {
  console.log(`listening on port ${port}`);
});
