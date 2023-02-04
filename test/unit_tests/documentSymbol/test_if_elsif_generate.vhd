library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test is
end test;

architecture arch of test is
  signal x : integer;
begin

  p_gen2 : if true generate
    x <= x;
  elsif alt_label: false generate
    x <= x;
  end generate p_gen2;
end arch;
