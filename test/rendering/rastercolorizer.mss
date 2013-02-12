#world {
  raster-opacity:0;
  raster-colorizer-default-mode:discrete;
  raster-colorizer-default-color:#f00;
  raster-colorizer-epsilon:0.05;
  raster-colorizer-stops:
    stop(5, #f00)
    stop(10, #f40, linear)
    stop(10, #f80);
}