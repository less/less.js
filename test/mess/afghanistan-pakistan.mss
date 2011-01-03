/* ======================================================== *
 * AFGHANISTAN & PAKISTAN                                   *
 * Roads & Borders                                          *
 * ======================================================== */

Map {
/*  map-bgcolor: #F5EED6;*/ 
	map-bgcolor: transparent;
}

.border,
.road {
  line-cap: round; /* butt|round|square */
  line-join: miter; /* miter|round|bevel */
}

/* == AREAS =============================================== */
/*
#pakistan_admin_fill[PROV_NAME="Disputed Area"][zoom<=10] {
  polygon-pattern-file: url(./res/stripes-red-diagonal.png);
}
*/

#pakistan_admin_fill[PROV_NAME="Disputed Area"] {
  polygon-pattern-file: url(./res/stripes-red-diagonal.png);
}

#pakistan_admin_fill[PROV_NAME="Disputed Area"][zoom>=11] {
  polygon-pattern-file: url(./res/stripes-red-diagonal-big.png);
}

.natural[zoom>=9] { polygon-pattern-file: url(./res/natural.png); }

.water { polygon-fill: #1c7b78; }


/* == BORDERS ============================================= */

/* ---- National ------------------------------------------ */
.border.country           { line-color: #666; line-opacity: 0.3; outline-color: #666; outline-opacity: 0.1; }

.bodder.country[zoom<=2]  { line-width: 0.5; }

.border.country[zoom=3]   { line-width: 0.5; outline-width: 0.5; }

.border.country[zoom=4]   { line-width: 0.7; outline-width: 0.7; }

.border.country[zoom=5]   { line-width: 1.0; outline-width: 1.0; }

.border.country[zoom=6]   { line-width: 1.1; outline-width: 1.1; }

.border.country[zoom=7]   { line-width: 1.2; outline-width: 1.2; }

.border.country[zoom=8]   { line-width: 1.3; outline-width: 1.3; }

.border.country[zoom=9]   { line-width: 1.4; outline-width: 1.4; }

.border.country[zoom=10]  { line-width: 1.5; outline-width: 1.5; }

.border.country[zoom=11]  { line-width: 1.6; outline-width: 1.6; }

.border.country[zoom=12]  { line-width: 1.7; outline-width: 1.7; }

.border.country[zoom=13]  { line-width: 1.8; outline-width: 1.8; }

.border.country[zoom=14]  { line-width: 1.9; outline-width: 1.9; }

.border.country[zoom>=15] { line-width: 2.0; outline-width: 2.0; }


/* ---- Provincial ---------------------------------------- */
.border.province[zoom>=5] { line-color: #666; outline-color: #fff; outline-opacity: 0.3; }

.border.province[zoom=5] { line-width: 0.4; outline-width: 1.5; }

.border.province[zoom=6] { line-width: 0.5; outline-width: 1.5; }

.border.province[zoom=7] { line-width: 0.6; outline-width: 1.5; }

.border.province[zoom=8] { line-width: 0.7; outline-width: 1.5; }

.border.province[zoom=9] { line-width: 0.8; outline-width: 1.5; }

/* ---- District ------------------------------------------ */
.border.district[zoom>=8] {
  line-color: #000;
	line-opacity: 0.1;
}

.border.district[zoom>=8]  { line-width: 1.0; }

/*.border.district[zoom=9]  { line-width: 1.1; }

.border.district[zoom=10] { line-width: 1.2; }

.border.district[zoom=11] { line-width: 1.3; }

.border.district[zoom=12] { line-width: 1.4; }

.border.district[zoom>12] { line-width: 1.5; }


/* == BUILDINGS =========================================== */

.building[zoom>=9] {
	polygon-fill: #ccc;
}

/* == ROADS =============================================== */

/* ---- Motorways ----------------------------------------- */
.road.motorway[zoom>=7][TYPE='motorway']         { line-color: #e0714c; }

.road.outline[zoom>=7][zoom<=10][TYPE='motorway']{ line-color: #873217; }
.road.outline[zoom>=11][TYPE='motorway']         { line-color: #41150b; }

.road.motorway[zoom=7][TYPE='motorway']          { line-width: 1.5; }
.road.outline[zoom=7][TYPE='motorway']           { line-width: 0; }

.road.motorway[zoom=8][TYPE='motorway']          { line-width: 2; }
.road.outline[zoom=8][TYPE='motorway']           { line-width: 0; }
.road.secondary[zoom=8][TYPE='motorway_link']    { line-width: 1.5; }
.road.outline[zoom=8][TYPE='motorway_link']      { line-width: 0; }

.road.motorway[zoom=9][TYPE='motorway']          { line-width: 2; }
.road.outline[zoom=9][TYPE='motorway']           { line-width: 3.5; }
.road.secondary[TYPE='motorway_link'][zoom=9]    { line-width: 1.5; }
.road.outline[TYPE='motorway_link'][zoom=9]      { line-width: 3; }

.road.motorway[TYPE='motorway'][zoom=10]         { line-width: 3; }
.road.outline[TYPE='motorway'][zoom=10]          { line-width: 4.5; }
.road.secondary[TYPE='motorway_link'][zoom=10]   { line-width: 2; }
.road.outline[TYPE='motorway_link'][zoom=10]     { line-width: 3.5; }

.road.motorway[TYPE='motorway'][zoom=11]         { line-width: 4; }
.road.outline[TYPE='motorway'][zoom=11]          { line-width: 5.5; }
.road.secondary[TYPE='motorway_link'][zoom=11]   { line-width: 3; }
.road.outline[TYPE='motorway_link'][zoom=11]     { line-width: 4.5; }

.road.motorway[TYPE='motorway'][zoom=12]         { line-width: 5; }
.road.outline[TYPE='motorway'][zoom=12]          { line-width: 6.5; }
.road.secondary[TYPE='motorway_link'][zoom=12]   { line-width: 4; }
.road.outline[TYPE='motorway_link'][zoom=12]     { line-width: 5.5; }

.road.motorway[TYPE='motorway'][zoom=13]         { line-width: 6; }
.road.outline[TYPE='motorway'][zoom=13]          { line-width: 7.5; }
.road.secondary[TYPE='motorway_link'][zoom=13]   { line-width: 5; }
.road.outline[TYPE='motorway_link'][zoom=13]     { line-width: 4.5; }

.road.motorway[TYPE='motorway'][zoom=14]         { line-width: 8; }
.road.outline[TYPE='motorway'][zoom=14]          { line-width: 9.5; }
.road.secondary[TYPE='motorway_link'][zoom=14]   { line-width: 7; }
.road.outline[TYPE='motorway_link'][zoom=14]     { line-width: 8.5; }

.road.motorway[TYPE='motorway'][zoom=15]         { line-width: 9; }
.road.outline[TYPE='motorway'][zoom=15]          { line-width: 10.5; }
.road.secondary[TYPE='motorway_link'][zoom=15]   { line-width: 8; }
.road.outline[TYPE='motorway_link'][zoom=15]     { line-width: 9.5; }

.road.motorway[TYPE='motorway'][zoom>=16]        { line-width: 10; }
.road.outline[TYPE='motorway'][zoom>=16]         { line-width: 11.5; }
.road.secondary[TYPE='motorway_link'][zoom>=16]  { line-width: 9; }
.road.outline[TYPE='motorway_link'][zoom>=16]    { line-width: 10.5; }

/* ---- Trunks -------------------------------------------- */
.road.trunk[TYPE='trunk'][zoom>=7]               { line-color: #e68d6e; }
.road.outline[TYPE='trunk'][zoom>=7]             { line-color: #CF5A34; }

.road.trunk[TYPE='trunk'][zoom=7]                { line-width: 1.5; }
.road.outline[TYPE='trunk'][zoom=7]              { line-width: 0; }

.road.trunk[TYPE='trunk'][zoom=8]                { line-width: 2; }
.road.outline[TYPE='trunk'][zoom=8]              { line-width: 0; }
.road.trunk[TYPE='trunk_link'][zoom=9]           { line-width: 1; }
.road.outline[TYPE='trunk_link'][zoom=9]         { line-width: 0; }

.road.trunk[TYPE='trunk'][zoom=9]                { line-width: 1.5; }
.road.outline[TYPE='trunk'][zoom=9]              { line-width: 3; }
.road.trunk[TYPE='trunk_link'][zoom=9]           { line-width: 1; }
.road.outline[TYPE='trunk_link'][zoom=9]         { line-width: 2.5; }

.road.trunk[TYPE='trunk'][zoom=10]               { line-width: 2; }
.road.outline[TYPE='trunk'][zoom=10]             { line-width: 3.5; }
.road.trunk[TYPE='trunk_link'][zoom=10]          { line-width: 1; }
.road.outline[TYPE='trunk_link'][zoom=10]        { line-width: 2.5; }

.road.trunk[TYPE='trunk'][zoom=11]               { line-width: 3; }
.road.outline[TYPE='trunk'][zoom=11]             { line-width: 4.5; }
.road.trunk[TYPE='trunk_link'][zoom=11]          { line-width: 2; }
.road.outline[TYPE='trunk_link'][zoom=11]        { line-width: 3.5; }

.road.trunk[TYPE='trunk'][zoom=12]               { line-width: 4; }
.road.outline[TYPE='trunk'][zoom=12]             { line-width: 5.5; }
.road.trunk[TYPE='trunk_link'][zoom=12]          { line-width: 3; }
.road.outline[TYPE='trunk_link'][zoom=12]        { line-width: 4.5; }

.road.trunk[TYPE='trunk'][zoom=13]               { line-width: 5; }
.road.outline[TYPE='trunk'][zoom=13]             { line-width: 6.5; }
.road.trunk[TYPE='trunk_link'][zoom=13]          { line-width: 4; }
.road.outline[TYPE='trunk_link'][zoom=13]        { line-width: 5.5; }

.road.trunk[TYPE='trunk'][zoom=14]               { line-width: 7; }
.road.outline[TYPE='trunk'][zoom=14]             { line-width: 8.5; }
.road.trunk[TYPE='trunk_link'][zoom=14]          { line-width: 6; }
.road.outline[TYPE='trunk_link'][zoom=14]        { line-width: 7.5; }

.road.trunk[TYPE='trunk'][zoom=15]               { line-width: 9; }
.road.outline[TYPE='trunk'][zoom=15]             { line-width: 10.5; }
.road.trunk[TYPE='trunk_link'][zoom=15]          { line-width: 8; }
.road.outline[TYPE='trunk_link'][zoom=15]        { line-width: 9.5; }

.road.trunk[TYPE='trunk'][zoom>=16]              { line-width: 10; }
.road.outline[TYPE='trunk'][zoom>=16]            { line-width: 11.5; }
.road.trunk[TYPE='trunk_link'][zoom>=16]         { line-width: 9; }
.road.outline[TYPE='trunk_link'][zoom>=16]       { line-width: 10.5; }


/* ---- Primary Roads ------------------------------------- */
.road.primary[TYPE='primary'][zoom>=8]           { line-color: #f6b47c; }
.road.outline[TYPE='primary'][zoom>=8]           { line-color: #d47053; }

.road.primary[TYPE='primary'][zoom=8]            { line-width: 1; }
.road.outline[TYPE='primary'][zoom=8]            { line-width: 0; }

.road.primary[TYPE='primary'][zoom=9]            { line-width: 1; }
.road.outline[TYPE='primary'][zoom=9]            { line-width: 2.5; }
.road.primary[TYPE='primary_link'][zoom=9]       { line-width: 0.5; }
.road.outline[TYPE='primary_link'][zoom=9]       { line-width: 2; }

.road.primary[TYPE='primary'][zoom=10]           { line-width: 1.5; }
.road.outline[TYPE='primary'][zoom=10]           { line-width: 3; }
.road.primary[TYPE='primary_link'][zoom=10]      { line-width: 1; }
.road.outline[TYPE='primary_link'][zoom=10]      { line-width: 2.5; }

.road.primary[TYPE='primary'][zoom=11]           { line-width: 2; }
.road.outline[TYPE='primary'][zoom=11]           { line-width: 3.5; }
.road.primary[TYPE='primary_link'][zoom=11]      { line-width: 1; }
.road.outline[TYPE='primary_link'][zoom=11]      { line-width: 2.5; }

.road.primary[TYPE='primary'][zoom=12]           { line-width: 3; }
.road.outline[TYPE='primary'][zoom=12]           { line-width: 4.5; }
.road.primary[TYPE='primary_link'][zoom=12]      { line-width: 2; }
.road.outline[TYPE='primary_link'][zoom=12]      { line-width: 3.5; }

.road.primary[TYPE='primary'][zoom=13]           { line-width: 4; }
.road.outline[TYPE='primary'][zoom=13]           { line-width: 5.5; }
.road.primary[TYPE='primary_link'][zoom=13]      { line-width: 3; }
.road.outline[TYPE='primary_link'][zoom=13]      { line-width: 4.5; }

.road.primary[TYPE='primary'][zoom=14]           { line-width: 7; }
.road.outline[TYPE='primary'][zoom=14]           { line-width: 8.5; }
.road.primary[TYPE='primary_link'][zoom=14]      { line-width: 6; }
.road.outline[TYPE='primary_link'][zoom=14]      { line-width: 7.5; }

.road.primary[TYPE='primary'][zoom=15]           { line-width: 9; }
.road.outline[TYPE='primary'][zoom=15]           { line-width: 10.5; }
.road.primary[TYPE='primary_link'][zoom=15]      { line-width: 8; }
.road.outline[TYPE='primary_link'][zoom=15]      { line-width: 9.5; }

.road.primary[TYPE='primary'][zoom>=16]          { line-width: 10; }
.road.outline[TYPE='primary'][zoom>=16]          { line-width: 11.5; }
.road.primary[TYPE='primary_link'][zoom>=16]     { line-width: 9; }
.road.outline[TYPE='primary_link'][zoom>=16]     { line-width: 10.5; }


/* ---- Secondary Roads ----------------------------------- */
.road.secondary[TYPE='secondary'][zoom>=9]       { line-color: #f6d69a; }
.road.outline[TYPE='secondary'][zoom>=9]         { line-color: #DE7C26; }

.road.secondary[TYPE='secondary'][zoom=9]        { line-width: 1; }
.road.outline[TYPE='secondary'][zoom=9]          { line-width: 2.5; }

.road.secondary[TYPE='secondary'][zoom=10]       { line-width: 1.0; }
.road.outline[TYPE='secondary'][zoom=10]         { line-width: 2.5; }
.road.secondary[TYPE='secondary_link'][zoom=10]  { line-width: 0.5; }
.road.outline[TYPE='secondary_link'][zoom=10]    { line-width: 2; }

.road.secondary[TYPE='secondary'][zoom=11]       { line-width: 1.5; }
.road.outline[TYPE='secondary'][zoom=11]         { line-width: 3; }
.road.secondary[TYPE='secondary_link'][zoom=11]  { line-width: 1.0; }
.road.outline[TYPE='secondary_link'][zoom=11]    { line-width: 2.5; }

.road.secondary[TYPE='secondary'][zoom=12]       { line-width: 2; }
.road.outline[TYPE='secondary'][zoom=12]         { line-width: 3.5; }
.road.secondary[TYPE='secondary_link'][zoom=12]  { line-width: 1; }
.road.outline[TYPE='secondary_link'][zoom=12]    { line-width: 2.5; }

.road.secondary[TYPE='secondary'][zoom=13]       { line-width: 3; }
.road.outline[TYPE='secondary'][zoom=13]         { line-width: 4.5; }
.road.secondary[TYPE='secondary_link'][zoom=13]  { line-width: 2; }
.road.outline[TYPE='secondary_link'][zoom=13]    { line-width: 3.5; }

.road.secondary[TYPE='secondary'][zoom=14]       { line-width: 5; }
.road.outline[TYPE='secondary'][zoom=14]         { line-width: 6.5; }
.road.secondary[TYPE='secondary_link'][zoom=14]  { line-width: 4; }
.road.outline[TYPE='secondary_link'][zoom=14]    { line-width: 5.5; }

.road.secondary[TYPE='secondary'][zoom=15]       { line-width: 7; }
.road.outline[TYPE='secondary'][zoom=15]         { line-width: 8.5; }
.road.secondary[TYPE='secondary_link'][zoom=15]  { line-width: 5; }
.road.outline[TYPE='secondary_link'][zoom=15]    { line-width: 6.5; }

.road.secondary[TYPE='secondary'][zoom>=16]      { line-width: 7; }
.road.outline[TYPE='secondary'][zoom>=16]        { line-width: 9.5; }
.road.secondary[TYPE='secondary_link'][zoom>=16] { line-width: 6; }
.road.outline[TYPE='secondary_link'][zoom>=16]   { line-width: 7.5; }

/* ---- Tertiary Roads ------------------------------------ */
.road.tertiary[TYPE='tertiary'][zoom>=10]        { line-color: #f6e8ae; }
.road.outline[TYPE='tertiary'][zoom>=10]         { line-color: #E6A329; }

.road.tertiary[TYPE='tertiary'][zoom=10]         { line-width: 1; }
.road.outline[TYPE='tertiary'][zoom=10]          { line-width: 2.5; }

.road.tertiary[TYPE='tertiary'][zoom=11]         { line-width: 1.5; }
.road.outline[TYPE='tertiary'][zoom=11]          { line-width: 3; }

.road.tertiary[TYPE='tertiary'][zoom=12]         { line-width: 2; }
.road.outline[TYPE='tertiary'][zoom=12]          { line-width: 3.5; }

.road.tertiary[TYPE='tertiary'][zoom=13]         { line-width: 3.0; }
.road.outline[TYPE='tertiary'][zoom=13]          { line-width: 4.5; }

.road.tertiary[TYPE='tertiary'][zoom=14]         { line-width: 5.0; }
.road.outline[TYPE='tertiary'][zoom=14]          { line-width: 6.5; }

.road.tertiary[TYPE='tertiary'][zoom=15]         { line-width: 7.0; }
.road.outline[TYPE='tertiary'][zoom=15]          { line-width: 8.5; }

.road.tertiary[TYPE='tertiary'][zoom>=16]        { line-width: 8.0; }
.road.outline[TYPE='tertiary'][zoom>=16]         { line-width: 9.5; }

/* ---- Minor Roads --------------------------------------- */
.road.minor[TYPE='residential'][zoom>=11],
.road.minor[TYPE='road'][zoom>=11],
.road.minor[TYPE='unclassified'][zoom>=11]       { line-color: #aaa; }

.road.minor[TYPE='residential'][zoom=11],
.road.minor[TYPE='road'][zoom=11],
.road.minor[TYPE='unclassified'][zoom=11]        { line-width: 1; }

.road.minor[TYPE='residential'][zoom>=12],
.road.minor[TYPE='road'][zoom>=12],
.road.minor[TYPE='unclassified'][zoom>=12]       { line-color: #fff; }

.road.outline[TYPE='residential'][zoom>=12],
.road.outline[TYPE='road'][zoom>=12],
.road.outline[TYPE='unclassified'][zoom>=12]     { line-color: #aaa; }

.road.minor[TYPE='road'][zoom=12],
.road.minor[TYPE='residential'][zoom=12],
.road.minor[TYPE='unclassified'][zoom=12]        { line-width: 1; }
.road.outline[TYPE='residential'][zoom=12],
.road.outline[TYPE='road'][zoom=12],
.road.outline[TYPE='unclassified'][zoom=12]      { line-width: 2.5; }

.road.minor[TYPE='road'][zoom=13],
.road.minor[TYPE='residential'][zoom=13],
.road.minor[TYPE='unclassified'][zoom=13]        { line-width: 1.5; }
.road.outline[TYPE='road'][zoom=13],
.road.outline[TYPE='residential'][zoom=13],
.road.outline[TYPE='unclassified'][zoom=13]      { line-width: 3; }

.road.minor[TYPE='road'][zoom=14],
.road.minor[TYPE='residential'][zoom=14],
.road.minor[TYPE='unclassified'][zoom=14]        { line-width: 2.5; }
.road.outline[TYPE='road'][zoom=14],
.road.outline[TYPE='residential'][zoom=14],
.road.outline[TYPE='unclassified'][zoom=14]      { line-width: 4; }

.road.minor[TYPE='road'][zoom=15],
.road.minor[TYPE='residential'][zoom=15],
.road.minor[TYPE='unclassified'][zoom=15]        { line-width: 5.0; }
.road.outline[TYPE='road'][zoom=15],
.road.outline[TYPE='residential'][zoom=15],
.road.outline[TYPE='unclassified'][zoom=15]      { line-width: 6.5; }

.road.minor[TYPE='road'][zoom>=16],
.road.minor[TYPE='residential'][zoom>=16],
.road.minor[TYPE='unclassified'][zoom>=16]       { line-width: 6.0; }
.road.outline[TYPE='road'][zoom>=16],
.road.outline[TYPE='residential'][zoom>=16],
.road.outline[TYPE='unclassified'][zoom>=16]     { line-width: 7.5; }

/* ---- Pedestrian ----------------------------------------
.road.minor[TYPE='footway'][zoom=13],
.road.minor[TYPE='pedestrian'][zoom=13],
.road.minor[TYPE='path'][zoom=13]   { line-width: 0.4; line-color: #fff; line-dasharray: 1, 2; line-opacity: 0.8; }

.road.minor[TYPE='footway'][zoom=14],
.road.minor[TYPE='pedestrian'][zoom=14],
.road.minor[TYPE='path'][zoom=14]   { line-width: 0.8; line-color: #fff; line-dasharray: 1, 2; line-opacity: 0.8; }

.road.minor[TYPE='footway'][zoom=15],
.road.minor[TYPE='pedestrian'][zoom=15],
.road.minor[TYPE='path'][zoom=15]   { line-width: 1.4; line-color: #fff; line-dasharray: 2, 4; line-opacity: 0.8; }

*/

/* == LABELS ============================================== */

/* ---- Countries ----------------------------------------- */

.label.country[zoom<=7] NAME {
	text-allow-overlap: true;
	text-face-name: "Aller Italic";
	text-fill: #333;
	text-halo-fill: #fff;
	text-halo-radius: 1;
	text-placement: point;
}

.label.country[zoom<=5] NAME  { text-size: 12; }

.label.country[zoom=6] NAME   { text-size: 14; }

.label.country[zoom=7] NAME   { text-size: 16; }
 

/* ---- Provincial ---------------------------------------- */
#afghanistan-label-province[zoom>=6] Prov_34_Na,
#pakistan-label-province[zoom>=6] PROV_NAME {
  text-face-name: "Aller Italic";
  text-size: 10;
  text-fill: #333;
  text-placement: point;
  text-halo-radius: 1; 
  text-halo-fill: #fff; 
  text-wrap-width: 50;
  text-avoid-edges: false;
}

#afghanistan-label-province[zoom=7] Prov_34_Na,
#pakistan-label-province[zoom=7] PROV_NAME  { text-size: 11; }

#afghanistan-label-province[zoom=8] Prov_34_Na,
#pakistan-label-province[zoom=8] PROV_NAME  { text-size: 12; }

#afghanistan-label-province[zoom=9] Prov_34_Na,
#pakistan-label-province[zoom=9] PROV_NAME { text-size: 13; }

#afghanistan-label-province[zoom=10] Prov_34_Na,
#pakistan-label-province[zoom=10] PROV_NAME { text-size: 14; }

#afghanistan-label-province[zoom=11] Prov_34_Na,
#pakistan-label-province[zoom=11] PROV_NAME { text-size: 15; }

#afghanistan-label-province[zoom=12] Prov_34_Na,
#pakistan-label-province[zoom=12] PROV_NAME { text-size: 16; }

/* ---- District ------------------------------------------ */
.label.nwfp[zoom>=11] UC_NAME_EN,
#afghanistan-label-district[zoom>=9] DIST_34_NA,
#pakistan-label-district[zoom>=9] TEHSIL {
  text-face-name: "Aller Regular";
  text-fill: #000;
  text-placement: point;
  text-halo-radius: 1; 
  text-halo-fill: #fff; 
  text-size: 10;
  text-wrap-width: 50;
  text-avoid-edges: false;
}

/*.label.nwfp UC_NAME_EN,
#afghanistan-label-district[zoom=10] DIST_34_NA,
#pakistan-label-district[zoom=10] TEHSIL { text-size: 11; }

.label.nwfp UC_NAME_EN,
#afghanistan-label-district[zoom=11] DIST_34_NA,
#pakistan-label-district[zoom=11] TEHSIL { text-size: 12; }

.label.nwfp UC_NAME_EN,
#afghanistan-label-district[zoom=12] DIST_34_NA,
#pakistan-label-district[zoom=12] TEHSIL { text-size: 13; }

.label.nwfp UC_NAME_EN,
#afghanistan-label-district[zoom=13] DIST_34_NA,
#pakistan-label-district[zoom=13] TEHSIL { text-size: 14; }

.label.nwfp UC_NAME_EN,
#afghanistan-label-district[zoom=14] DIST_34_NA,
#pakistan-label-district[zoom=14] TEHSIL { text-size: 15; }*/

/* ---- Roadis -------------------------------------------- */
.road.label[TYPE='motorway'][zoom>=9] NAME,
.road.label[TYPE='trunk'][zoom>=9] NAME,
.road.label[TYPE='primary'][zoom>=10] NAME,
.road.label[TYPE='secondary'][zoom>=14] NAME,
.road.label[TYPE='tertiary'][zoom>=15] NAME {
  text-face-name: "DejaVu Sans Book";
  text-size: 9;
  text-fill: #000;
	text-halo-fill: #fff;
	text-halo-radius: 1;
  text-placement: line;
  text-max-char-angle-delta: 20;
  text-min-distance: 200;
  text-spacing: 400;
}

/* ---- NWFP ---------------------------------------------- */
.border.nwfp { line-color: #f00; line-opacity: 0.5; line-width: 0.5; }
