library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test_signal is

end test_signal;

architecture arch of test_signal is
  signal foo : std_ulogic;
  signal b   : std_ulogic;
begin
  foo <= '1';
  b   <= foo;
end architecture;
