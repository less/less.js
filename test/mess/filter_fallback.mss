/**

  An example of how fallbacks should work.

  Final object model should be:

  <Style>
    <Rule>
      <Filter>[NAME] = "United States"</Filter>
      <LineSymbolizer color="#000000" opacity="0.5" />
    </Rule>
    <Rule>
      <ElseFilter />
      <LineSymbolizer color="#111111" opacity="0.5" />
    </Rule>
  </Style>

*/
 


#world {
  line-opacity: 0.5;
  line-color: #111;
}

#world[NAME = "United States"] {
  line-color: #000;
}


