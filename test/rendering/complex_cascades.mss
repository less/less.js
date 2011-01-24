#world {
  polygon-fill: #FFF;
  line-color:#F00;
  line-width: 0.5;
}

#world[NAME='United States'] {
  polygon-fill:#CCC;
  [zoom > 6] { polygon-fill:#DDD; }
  [zoom > 7] { polygon-fill:#999; }
  [zoom > 5] { polygon-fill:#666; }
}

#world[NAME='Canada'],
#countries {
  polygon-fill: #eee;
  line-color: #ccc;
  line-width: 1;

  .new {
    polygon-fill: #CCC;
  }

  .new[zoom > 5] {
    line-width:0.5;

    [NAME='United States'] {
      polygon-fill:#AFC;
    }
  }
}
