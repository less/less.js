/**
 
 Negation

 */


.wood[zoom>11][wood!='coniferous'][wood!='deciduous'] {
  polygon-pattern-file: url(./res/pattern-wood.png);
}
  .wood[wood='coniferous'][size='huge'][zoom>8],
  .wood[wood='coniferous'][size='large'][zoom>9],
  .wood[wood='coniferous'][size='medium'][zoom>10],
  .wood[wood='coniferous'][size='small'][zoom>11] {
    polygon-pattern-file: url(./res/pattern-wood-coniferous.png);
  }
  .wood[wood='deciduous'][size='huge'][zoom>8],
  .wood[wood='deciduous'][size='large'][zoom>9],
  .wood[wood='deciduous'][size='medium'][zoom>10],
  .wood[wood='deciduous'][size='small'][zoom>11] {
    polygon-pattern-file: url(./res/pattern-wood-deciduous.png);
  }

/**

 cascadenik-style.py

.wood[scale-denominator<200000][wood!=coniferous][wood!=deciduous] {
    polygon-pattern-file: url("./res/pattern-wood.png"); }
.wood[wood=coniferous][size=huge][scale-denominator<1500000] {
    polygon-pattern-file: url("./res/pattern-wood-coniferous.png"); }
.wood[wood=coniferous][size=large][scale-denominator<750000] {
    polygon-pattern-file: url("./res/pattern-wood-coniferous.png"); }
.wood[wood=coniferous][size=medium][scale-denominator<400000] {
    polygon-pattern-file: url("./res/pattern-wood-coniferous.png"); }
.wood[wood=coniferous][size=small][scale-denominator<200000] {
    polygon-pattern-file: url("./res/pattern-wood-coniferous.png"); }
.wood[wood=deciduous][size=huge][scale-denominator<1500000] {
    polygon-pattern-file: url("./res/pattern-wood-deciduous.png"); }
.wood[wood=deciduous][size=large][scale-denominator<750000] {
    polygon-pattern-file: url("./res/pattern-wood-deciduous.png"); }
.wood[wood=deciduous][size=medium][scale-denominator<400000] {
    polygon-pattern-file: url("./res/pattern-wood-deciduous.png"); }
.wood[wood=deciduous][size=small][scale-denominator<200000] {
    polygon-pattern-file: url("./res/pattern-wood-deciduous.png"); }
 
 */
