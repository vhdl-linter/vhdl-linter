library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_process is
  port (
    x: inout integer
  );
end test_process;

architecture arch of test_process is
begin

  process(all)
  begin
    x <= x;
  end process;

end arch;
