/* Font sets */
@gothic_book: "Franklin Gothic FS Book","DejaVu Sans Book";
@gothic_med: "Franklin Gothic FS Medium","DejaVu Sans Book";

/* ---- COUNTRIES ---- */
#country-label[zoom>1][zoom<10]{
  text-face-name: @gothic_book;
  text-fill:rgba(0,0,0,0.5);
  text-size:9;
  text-transform:uppercase;
  text-halo-fill:rgba(255,255,255,0.5);
  text-halo-radius:1;
  text-character-spacing:1;
  text-line-spacing:1;
  text-wrap-width:20;
  text-name:"''";
  [zoom=3] {
    text-size:9;
  }
  [zoom=4] {
    text-size:11;
  }
  [zoom=5] {
    text-size:12;
    text-character-spacing:1;
    text-line-spacing:1;
  }
  [zoom=6] {
    text-size:14;
    text-character-spacing:2;
    text-line-spacing:2;
  }
  [zoom>6][zoom<10] {
    text-size:16;
    text-character-spacing:2;
    text-line-spacing:4;
  }

  [zoom>=2][Z_ABBREV = 2],
  [zoom>=3][Z_ABBREV = 3],
  [zoom>=4][Z_ABBREV = 4],
  [zoom>=5][Z_ABBREV = 5],
  [zoom>=6][Z_ABBREV = 6] { text-name: "[ABBREV]"; }

  [zoom>=2][Z_NAME = 2],
  [zoom>=3][Z_NAME = 3],
  [zoom>=4][Z_NAME = 4],
  [zoom>=5][Z_NAME = 5],
  [zoom>=6][Z_NAME = 6] { text-name: "[NAME]"; }

  [zoom>=2][Z_ADMIN = 2],
  [zoom>=3][Z_ADMIN = 3],
  [zoom>=4][Z_ADMIN = 4],
  [zoom>=5][Z_ADMIN = 5],
  [zoom>=6][Z_ADMIN = 6] { text-name: "[ADMIN]"; } 
}

/* ---- CITIES ---- */
#city {
  [SCALERANK<3][zoom>=4],
  [SCALERANK=3][zoom>=5],
  [SCALERANK=4][zoom>=5],
  [SCALERANK=5][zoom>=6],
  [SCALERANK=6][zoom>=6],
  [SCALERANK=7][zoom>=7],
  [SCALERANK=8][zoom>=7],
  [SCALERANK=9][zoom>=8],
  [SCALERANK=10][zoom>=8] {
    text-name: "[NAMEASCII]";
    text-face-name: @gothic_med;
    text-size: 10;
    text-fill: rgba(0,0,0,0.6);
    text-halo-radius: 1;
    text-halo-fill: rgba(255,255,255,0.4);
  }
  [zoom=4] {
    [SCALERANK<3] { text-size: 12; }
  }
  [zoom=5] {
    [SCALERANK<3] { text-size: 13; }
    [SCALERANK=3] { text-size: 12; }
    [SCALERANK=4] { text-size: 11; }
  }
  [zoom=6] {
    [SCALERANK<3] { text-size: 14; }
    [SCALERANK=3] { text-size: 13; }
    [SCALERANK=4] { text-size: 12; }
    [SCALERANK=5] { text-size: 11; }
  }
  [zoom=7] {
    [SCALERANK<3] { text-size: 15; }
    [SCALERANK=3] { text-size: 14; }
    [SCALERANK=4] { text-size: 13; }
    [SCALERANK=5] { text-size: 12; }
    [SCALERANK=6] { text-size: 11; }
    [SCALERANK=7] { text-size: 11; }
  }
  [zoom=8] {
    [SCALERANK<3] { text-size: 15; }
    [SCALERANK=3] { text-size: 15; }
    [SCALERANK=4] { text-size: 14; }
    [SCALERANK=5] { text-size: 14; }
    [SCALERANK=6] { text-size: 13; }
    [SCALERANK=7] { text-size: 13; }
    [SCALERANK=8] { text-size: 12; }
    [SCALERANK=9] { text-size: 11; }
  }
  [zoom=9] {
    [SCALERANK<3] { text-size: 16; }
    [SCALERANK=3] { text-size: 16; }
    [SCALERANK=4] { text-size: 15; }
    [SCALERANK=5] { text-size: 15; }
    [SCALERANK=6] { text-size: 14; }
    [SCALERANK=7] { text-size: 14; }
    [SCALERANK=8] { text-size: 13; }
    [SCALERANK=9] { text-size: 13; }
    [SCALERANK=10] { text-size: 12; }
  }
  [zoom=10] {
    [SCALERANK<3] { text-size: 16; text-character-spacing:2; }
    [SCALERANK=3] { text-size: 16; text-character-spacing:2; }
    [SCALERANK=4] { text-size: 15; text-character-spacing:1; }
    [SCALERANK=5] { text-size: 15; text-character-spacing:1; }
    [SCALERANK=6] { text-size: 15; text-character-spacing:1; }
    [SCALERANK=7] { text-size: 14; }
    [SCALERANK=8] { text-size: 14; }
    [SCALERANK=9] { text-size: 13; }
    [SCALERANK=10] { text-size: 13; }
  }
  [zoom>10] {
    [SCALERANK<3] { text-size: 16; text-character-spacing:3; }
    [SCALERANK=3] { text-size: 16; text-character-spacing:3; }
    [SCALERANK=4] { text-size: 16; text-character-spacing:3; }
    [SCALERANK=5] { text-size: 15; text-character-spacing:2; }
    [SCALERANK=6] { text-size: 15; text-character-spacing:2; }
    [SCALERANK=7] { text-size: 15; text-character-spacing:2; }
    [SCALERANK=8] { text-size: 14; text-character-spacing:1; }
    [SCALERANK=9] { text-size: 14; text-character-spacing:1; }
    [SCALERANK=10] { text-size: 14; text-character-spacing:1; }
  }
}
