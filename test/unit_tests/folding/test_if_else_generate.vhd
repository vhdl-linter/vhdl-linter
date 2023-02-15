library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test is
end test;

architecture arch of test is
  signal x : integer;
begin

  p_gen : if alt_label: true generate
    x <= x;
  else generate
    x <= x;
  end generate p_gen;

end arch;
