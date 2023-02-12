library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity test is
  port (
    a_in  : in  std_ulogic;
    b_out : out std_ulogic
    );
end test;

architecture arch of test is

begin

  dummy : process(all)
  begin
    b_out <= a_in;
    a <= 5;
  end process;  -- dummy
end architecture;
