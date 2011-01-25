#world[zoom=9] {
  polygon-fill: #000;

  [zoom > 9] {
    polygon-fill: #FFF;
  }
}

#world[zoom<4] {
  polygon-fill: #FF0;
}

#countries {
  [zoom=1] { line-width:2; }
  [zoom=2] { line-width:1.5; }
  [zoom=3], [zoom=4] { line-width:1.25; }
  [zoom=5] { line-width:1; }
  [zoom=6] { line-width:0.9; }
  [zoom=7] { line-width:0.8; }
  [zoom=8] { line-width:0.7; }
  [zoom=9] { line-width:.6; }
  [zoom=10] { line-width:.5; }
  [zoom=11] { line-width:.4; }
  [zoom=12] { line-width:.3; }
  [zoom>12] { line-width:.25; }
}