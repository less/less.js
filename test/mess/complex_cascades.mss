#world {
  polygon-fill: #FFF;
  line-color:#F00;
  line-width: 0.5;
}

#world[NAME='United States'] {
  polygon-fill:#CCC;
  [zoom > 6] {
    polygon-fill:#DDD;
  }
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

/******************************************************************************/
/* FLATTENS INTO                                                              */
/******************************************************************************/

#world {
  polygon-fill: #FFF;
  line-color:#F00;
  line-width:0.5;
}

#world [NAME='United States'] {
  polygon-fill:#CCC;
}

#world [NAME='United States'] [zoom > 6] {
  polygon-fill:#DDD;
}

#world [NAME='Canada'] {
  polygon-fill: #eee;
  line-color: #ccc;
  line-width: 1;
}

#world .new [NAME='Canada'] {
  polygon-fill: #CCC;
}

#world .new [NAME='Canada'] [zoom > 5] {
  line-width:0.5;
}

#world .new [NAME='Canada'] [zoom > 5] [NAME='United States'] {
  /* how do we handle filter overrides? I think we should discard the entire
     ruleset since there's obviously no way for this to be true */
  polygon-fill:#AFC;
}

#countries {
  polygon-fill: #eee;
  line-color: #ccc;
  line-width: 1;
}

#countries .new {
  polygon-fill: #CCC;
}

#countries .new [zoom > 5] {
  line-width:0.5;
}

#countries .new [zoom > 5] [NAME='United States'] {
  /* for the #countries layer case, there was no previous filter on NAME, so we
     use that value and keep the ruleset */
  polygon-fill:#AFC;
}

/******************************************************************************/
/* CONVERTS TO                                                                */
/******************************************************************************/

Layer: #world

<Style>
  <Rule>
    <MinScaleDenominator>6</MinScaleDenominator>
    <Filter>[NAME] = "United States"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#DDDDDD" stroke-width="2" />
  </Rule>
  <Rule>
    <Filter>[NAME] = "United States"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#DDDDDD" stroke-width="2" />
  </Rule>
  <Rule>
    <Filter>[NAME] = "Canada"</Filter>
    <PolygonSymbolizer fill="#EEEEEE"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="1" />
  </Rule>
  <Rule>
    <ElseFilter/>
    <PolygonSymbolizer fill="#FFFFFF"/>
    <LineSymbolizer color="#FF0000" stroke-width="0.5" />
  </Rule>
</Style>



Layer #world.new

<Style>
  <Rule>
    <MinScaleDenominator>6</MinScaleDenominator>
    <Filter>[NAME] = "United States"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#DDDDDD" stroke-width="2" />
  </Rule>
  <Rule>
    <Filter>[NAME] = "United States"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#DDDDDD" stroke-width="2" />
  </Rule>
  <Rule>
    <MinScaleDenominator>5</MinScaleDenominator>
    <Filter>[NAME] = "Canada"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="0.5" />
  </Rule>
  <Rule>
    <Filter>[NAME] = "Canada"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="1" />
  </Rule>
  <Rule>
    <ElseFilter/>
    <PolygonSymbolizer fill="#FFFFFF"/>
    <LineSymbolizer color="#FF0000" stroke-width="0.5" />
  </Rule>
</Style>


Layer #countries

<Style>
  <Rule>
    <PolygonSymbolizer fill="#EEEEEE"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="2" />
  </Rule>
</Style>



Layer #countries.new

<Style>
  <Rule>
    <MinScaleDenominator>5</MinScaleDenominator>
    <Filter>[NAME] = "United States"</Filter>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="0.5" />
  </Rule>
  <Rule>
    <MinScaleDenominator>5</MinScaleDenominator>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="0.5" />
  </Rule>
  <Rule>
    <ElseFilter/>
    <PolygonSymbolizer fill="#CCCCCC"/>
    <LineSymbolizer color="#CCCCCC" stroke-width="2" />
  </Rule>
</Style>
