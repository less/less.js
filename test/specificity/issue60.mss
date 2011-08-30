#world {
  [NET_INFLOW > -30000] { polygon-fill: #f00; }
  [NET_INFLOW > -10000] { polygon-fill: #0f0; }
}

#world [OBJECTID=12] { polygon-pattern-file:url(../resources/textures/stripe.png); }
