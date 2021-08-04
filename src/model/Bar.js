export class Bar {

  i; // index
  interval; // timeframe
  open;
  high;
  low;
  close;
  volume;
  time;

  constructor(data, interval) {
    if (interval || Array.isArray(data)) {
      this.interval = interval;
      this.create(data);
    } else {
      this.streamUpdate(data);
    }
  }

  create(data) {
    this.time = data[0];
    this.open = Number(data[1]);
    this.high = Number(data[2]);
    this.low = Number(data[3]);
    this.close = Number(data[4]);
    this.volume = Number(data[5]);
  }

  streamUpdate(data) {
    this.time = data.t;
    this.open = Number(data.o);
    this.high = Number(data.h);
    this.low = Number(data.l);
    this.close = Number(data.c);
    this.volume = Number(data.v);
  }

}
