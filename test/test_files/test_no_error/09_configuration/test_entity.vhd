library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

-- only used for instantiating
entity test_entity is
  port (
      i_clk: in std_ulogic;
      o_clk: out std_ulogic
    );
begin
end test_entity;

architecture arch of test_entity is
begin
  o_clk <= i_clk;
end arch;
