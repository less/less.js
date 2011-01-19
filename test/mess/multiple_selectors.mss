/**

  Multiple selectors have to be split up into separate styles

  Final object model should be:

  <Style>
    <Rule>
      <Filter>[NAME] = "United States"</Filter>
      <LineSymbolizer color="#111111" opacity="0.5" />
    </Rule>
  </Style>

  <Style>
    <Rule>
      <LineSymbolizer color="#111111" opacity="0.5" />
    </Rule>
  </Style>

*/

#world[NAME = "United States"],
.otherlayer {
  line-opacity: 0.5;
  line-color: #111;
}
