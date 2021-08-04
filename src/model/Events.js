export class Events {

  levels;
  orders;
  state;
  ticker;

  constructor(ticker) {
    this.ticker = ticker;
    this.state = ticker?.state;
  }
}
