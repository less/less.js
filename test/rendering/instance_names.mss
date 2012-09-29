#world[zoom >= 13] {
  center/line-width: 1;
  center/line-color: black;
}

#world[zoom >= 14] {
  center/line-width: 5;
  center/line-color: blue;
}

#world[highway='primary'][zoom >= 14] {
  dash/line-color: red;
  dash/line-width: 15;
  dash/line-dasharray: 5,15;
}
