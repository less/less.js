Map {
  background-color: #fff;
}

#world {
  polygon-fill: #eee;
  line-color: #ccc;
  line-width: 0.5;
}

#world[POP2005 > 1000] {
  polygon-fill: #aaa;
}

#world[POP2005 < 1000] {
  polygon-fill: #bbb;
}
