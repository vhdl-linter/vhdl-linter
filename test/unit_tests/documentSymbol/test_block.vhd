library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_block is
end test_block;

architecture arch of test_block is
  signal x : integer;
begin

  block : block
    x <= x;
  end block;

end arch;
