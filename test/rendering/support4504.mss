@z13: 19;
@num_pixels: 50;
@z13area: @z13 * @z13 * @num_pixels;

#countries[way_area > @z13area] {
    polygon-opacity:0.2;
}
