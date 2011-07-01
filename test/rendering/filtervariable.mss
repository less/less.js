@us: 'US';
@thing: "COUNTRY";

#world[COUNTRY=@us] {
  polygon-fill: #000;
}
#world[@thing != 'US'] {
  polygon-fill: #f00;
  }
