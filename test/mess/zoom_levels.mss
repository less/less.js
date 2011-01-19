/**
 
 Zoom level overrides:

 should decompose into

 <Style name="#world">
    <Rule>
      <!-- extrapolated from base rule without filter -->
      <MaxScaleDenominator>5</MaxScaleDenominator>
      <LineSymbolizer width="1" />
    </Rule>
    <Rule>
      <MinScaleDenominator>5</MinScaleDenominator>
      <MaxScaleDenominator>6</MaxScaleDenominator>
      <LineSymbolizer width="5" />
    </Rule>
    <Rule>
      <MinScaleDenominator>6</MinScaleDenominator>
      <MaxScaleDenominator>7</MaxScaleDenominator>
      <LineSymbolizer width="6" />
    </Rule>
    <Rule>
      <MinScaleDenominator>7</MinScaleDenominator>
      <LineSymbolizer width="7" />
    </Rule>
  </Style>

*/


#world {
  line-width: 1;
}

#world [zoom > 5] {
  line-width: 5;
}

#world [zoom > 6] {
  line-width: 6;
}

#world [zoom > 7] {
  line-width: 7;
}
