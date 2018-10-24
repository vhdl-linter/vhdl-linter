package DEMO_PACK is
  constant SOME_FLAG : bit_vector := "11111111";
  type STATE is (RESET,IDLE,ACKA);
  function PARITY (X : bit_vector)
                   return bit;
end DEMO_PACK;
