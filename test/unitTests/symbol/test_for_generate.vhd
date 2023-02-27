library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test is
end test;

architecture arch of test is
  signal x : integer;
begin

  p_gen : for i in 0 to 3 generate
    x <= i + x;
  end generate p_gen;

end arch;
