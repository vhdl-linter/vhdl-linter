library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_else_generate is
end test_else_generate;

architecture arch of test_else_generate is
  signal x : integer;
begin

  p_reg : process(all)
  begin
    x <= x;
  end process;

end arch;
