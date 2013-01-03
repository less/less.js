#world.m_0 {
  line-width: 3;
}

#world.m_1[zoom > 2] {
  line-opacity: .2;
}

#world.m_2[zoom > 8] {
  line-opacity: .4;
}

#world.m_3[NAME!="Canada"] {
  line-width: 5;
}

#world.m_4[NAME="United States"] {
  line-color: #f00;
}

#world.m_6[NAME!="Canada"][zoom > 5] {
  line-opacity: .7;
}

#world.m_7[NAME!="Canada"][POP > 100000000] {
  line-width:20;
}

#world.m_8[NAME="United States"][zoom > 8] {
  line-opacity: .5;
}

#world.m_9[NAME="United States"][zoom > 8][zoom < 4] {
  line-opacity: .5;
}
