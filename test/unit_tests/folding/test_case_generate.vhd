library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test is
end test;

architecture arch of test is
  signal x : integer;
begin

  p_gen : case x generate
    when 1 =>
      x <= x;
    when others =>
      x <= x;
  end generate p_gen;

end arch;
